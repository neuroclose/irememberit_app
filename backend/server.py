from fastapi import FastAPI, APIRouter, Request, HTTPException, Query, Header, File, UploadFile
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime, timedelta
import httpx
import json


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# iRememberIt API base URL
IREMEMBERIT_API = "https://irememberit.replit.app/api"
WEB_API_BASE_URL = "https://irememberit.replit.app/api"


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Progress Tracking Models
class StageCompletion(BaseModel):
    userId: str
    moduleId: str
    cardId: str  # Distinct card ID within the module
    stage: int
    learningType: str  # 'fill_blank', 'word_cloud', 'verbal'
    pointsEarned: int
    timeSpent: int  # in seconds
    accuracy: float
    completedAt: datetime = Field(default_factory=datetime.utcnow)
    pointsBreakdown: dict = {}

class UserProgress(BaseModel):
    userId: str
    moduleId: str
    completedStages: dict = {}  # {stage-learningType: {points, completedAt}}
    totalPoints: int = 0
    highestStage: int = 1
    lastAccessed: datetime = Field(default_factory=datetime.utcnow)

# Progress Tracking Endpoints
@api_router.post("/progress/save")
async def save_stage_completion(completion: StageCompletion, request: Request):
    """Save a completed stage with points earned"""
    try:
        # Create or update user progress
        progress_key = f"{completion.stage}-{completion.learningType}"
        
        # Find existing progress
        existing = await db.user_progress.find_one({
            "userId": completion.userId,
            "moduleId": completion.moduleId
        })
        
        if existing:
            # Check if this stage was already completed
            if progress_key in existing.get("completedStages", {}):
                # Stage already completed, don't award points again
                return JSONResponse({
                    "success": True,
                    "pointsAwarded": 0,
                    "message": "Stage already completed",
                    "alreadyCompleted": True
                })
            
            # Update existing progress
            completed_stages = existing.get("completedStages", {})
            completed_stages[progress_key] = {
                "cardId": completion.cardId,
                "pointsEarned": completion.pointsEarned,
                "completedAt": completion.completedAt.isoformat(),
                "timeSpent": completion.timeSpent,
                "accuracy": completion.accuracy
            }
            
            new_total_points = existing.get("totalPoints", 0) + completion.pointsEarned
            new_highest_stage = max(existing.get("highestStage", 1), completion.stage)
            
            await db.user_progress.update_one(
                {"userId": completion.userId, "moduleId": completion.moduleId},
                {
                    "$set": {
                        "completedStages": completed_stages,
                        "totalPoints": new_total_points,
                        "highestStage": new_highest_stage,
                        "lastAccessed": datetime.utcnow()
                    }
                }
            )
        else:
            # Create new progress
            new_progress = {
                "userId": completion.userId,
                "moduleId": completion.moduleId,
                "completedStages": {
                    progress_key: {
                        "cardId": completion.cardId,
                        "pointsEarned": completion.pointsEarned,
                        "completedAt": completion.completedAt.isoformat(),
                        "timeSpent": completion.timeSpent,
                        "accuracy": completion.accuracy
                    }
                },
                "totalPoints": completion.pointsEarned,
                "highestStage": completion.stage,
                "lastAccessed": datetime.utcnow()
            }
            await db.user_progress.insert_one(new_progress)
        
        # Sync to web API using NEW mobile sync endpoint
        # PROGRESSIVE SYNC: Sync all previous stages (1 to current) to ensure web API has complete progression
        try:
            # Get the auth token from the request headers
            auth_header = request.headers.get("Authorization")
            if auth_header:
                headers = {"Authorization": auth_header}
                
                # Convert learning type to correct API format
                learning_type_map = {
                    "fill_blank": "fill-in-blank",
                    "word_cloud": "word-cloud",
                    "verbal": "verbal-speaking"
                }
                learning_type_formatted = learning_type_map.get(completion.learningType, completion.learningType)
                
                # Get the current progress document to check what stages have been completed
                current_progress = await db.user_progress.find_one({
                    "userId": completion.userId,
                    "moduleId": completion.moduleId
                })
                
                completed_stages = current_progress.get("completedStages", {}) if current_progress else {}
                
                async with httpx.AsyncClient() as client:
                    sync_url = "https://irememberit.replit.app/api/mobile/sync/complete-stage"
                    synced_count = 0
                    
                    # Sync all stages from 1 to current stage to ensure progressive completion
                    for stage_num in range(1, completion.stage + 1):
                        stage_key = f"{stage_num}-{completion.learningType}"
                        stage_data = completed_stages.get(stage_key)
                        
                        # Use data from completed stage or current completion
                        if stage_num == completion.stage:
                            # This is the current stage being completed
                            # passed=True only if points were earned (successful completion)
                            sync_payload = {
                                "moduleId": completion.moduleId,
                                "cardId": completion.cardId,
                                "learningType": learning_type_formatted,
                                "stage": stage_num,
                                "timeSpent": completion.timeSpent,
                                "passed": completion.pointsEarned > 0,  # True only if user earned points
                                "accuracy": completion.accuracy
                            }
                        elif stage_data:
                            # This is a previously completed stage
                            sync_payload = {
                                "moduleId": completion.moduleId,
                                "cardId": stage_data.get("cardId", completion.cardId),  # Use stored cardId or fallback
                                "learningType": learning_type_formatted,
                                "stage": stage_num,
                                "timeSpent": stage_data.get("timeSpent", 60),
                                "passed": True,
                                "accuracy": stage_data.get("accuracy", 100)
                            }
                        else:
                            # Stage not found in local data, skip (shouldn't happen in normal flow)
                            logging.warning(f"Stage {stage_num} not found in local progress, skipping sync")
                            continue
                        
                        logging.info(f"Syncing stage {stage_num}/{completion.stage}: {sync_payload}")
                        
                        try:
                            sync_response = await client.post(sync_url, json=sync_payload, headers=headers, timeout=10.0)
                            
                            if sync_response.status_code == 200:
                                synced_count += 1
                                response_data = sync_response.json()
                                logging.info(f"✅ Stage {stage_num} synced: {response_data.get('pointsAwarded', 0)} points")
                            else:
                                logging.error(f"❌ Failed to sync stage {stage_num}: {sync_response.status_code}")
                                logging.error(f"Response: {sync_response.text}")
                        except Exception as stage_sync_error:
                            logging.error(f"Error syncing stage {stage_num}: {stage_sync_error}")
                    
                    logging.info(f"✅ Progressive sync complete: {synced_count}/{completion.stage} stages synced")
            else:
                logging.warning("No authorization token provided - skipping web API sync")
        except Exception as sync_error:
            logging.warning(f"Could not sync to web API (non-fatal): {sync_error}")
            # Don't fail the request if web sync fails
        
        return JSONResponse({
            "success": True,
            "pointsAwarded": completion.pointsEarned,
            "message": "Progress saved successfully",
            "alreadyCompleted": False
        })
    except Exception as e:
        logging.error(f"Error saving progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/progress/{userId}/sync-all")
async def sync_all_progress_to_web(userId: str, request: Request):
    """One-time sync: Push all local progress to web API"""
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return JSONResponse({
                "success": False,
                "message": "Authorization token required"
            }, status_code=401)
        
        # Get all local progress for this user
        cursor = db.user_progress.find({"userId": userId})
        
        synced_count = 0
        failed_count = 0
        synced_stages = []
        
        async for progress_doc in cursor:
            module_id = progress_doc.get("moduleId")
            completed_stages = progress_doc.get("completedStages", {})
            
            # Sync each completed stage
            for stage_key, stage_data in completed_stages.items():
                try:
                    # Parse stage_key format: "1-fill_blank", "2-word_cloud"
                    parts = stage_key.split('-')
                    stage_num = int(parts[0])
                    learning_type = '-'.join(parts[1:])  # Handle multi-part types
                    
                    # Use the new mobile sync endpoint matching API spec
                    web_api_url = "https://irememberit.replit.app/api/mobile/sync/complete-stage"
                    
                    # Convert learning type to correct API format
                    learning_type_map = {
                        "fill_blank": "fill-in-blank",
                        "word_cloud": "word-cloud",
                        "verbal": "verbal-speaking"
                    }
                    learning_type_formatted = learning_type_map.get(learning_type, learning_type)
                    
                    # Get cardId from stage_data if available, otherwise use moduleId as fallback
                    card_id = stage_data.get("cardId", module_id)
                    
                    payload = {
                        "moduleId": module_id,
                        "cardId": card_id,
                        "learningType": learning_type_formatted,
                        "stage": stage_num,
                        "timeSpent": stage_data.get("timeSpent", 10),
                        "passed": True,  # These stages are completed
                        "accuracy": stage_data.get("accuracy", 100)
                    }
                    
                    headers = {"Authorization": auth_header}
                    
                    async with httpx.AsyncClient() as client:
                        web_response = await client.post(web_api_url, json=payload, headers=headers, timeout=10.0)
                        if web_response.status_code == 200:
                            synced_count += 1
                            synced_stages.append(f"{module_id}:{stage_key}")
                            logging.info(f"✅ Synced {stage_key} - {stage_data.get('pointsEarned')} points")
                        else:
                            failed_count += 1
                            logging.warning(f"Failed to sync {stage_key}: {web_response.status_code}")
                except Exception as stage_error:
                    failed_count += 1
                    logging.error(f"Error syncing stage {stage_key}: {stage_error}")
        
        return JSONResponse({
            "success": True,
            "synced": synced_count,
            "failed": failed_count,
            "syncedStages": synced_stages,
            "message": f"Synced {synced_count} stages to web API"
        })
    except Exception as e:
        logging.error(f"Error in sync-all: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/progress/{userId}/stats")
async def get_user_stats(userId: str, request: Request):
    """Get user's overall statistics (total points, weekly points, rank)"""
    try:
        # Fetch stats from web API (source of truth for cross-platform)
        web_stats = {"totalPoints": 0, "weeklyPoints": 0, "rank": None}
        try:
            # Get the auth token from the request headers
            auth_header = request.headers.get("Authorization")
            headers = {"Authorization": auth_header} if auth_header else {}
            
            async with httpx.AsyncClient() as client:
                # Fetch basic stats
                web_response = await client.get(
                    f"https://irememberit.replit.app/api/mobile/stats/{userId}",
                    headers=headers,
                    timeout=10.0
                )
                if web_response.status_code == 200:
                    web_data = web_response.json()
                    # Extract nested rank from points object
                    web_stats = {
                        "totalPoints": web_data.get("points", {}).get("total", 0),
                        "weeklyPoints": web_data.get("points", {}).get("weekly", 0),
                        "rank": web_data.get("points", {}).get("rank")
                    }
                    logging.info(f"Fetched stats from web API: {web_stats}")
                else:
                    logging.warning(f"Web API returned {web_response.status_code}, using local fallback")
                
                # Fetch leaderboard to get user's rank
                try:
                    leaderboard_response = await client.get(
                        "https://irememberit.replit.app/api/mobile/leaderboard?timeframe=alltime",
                        headers=headers,
                        timeout=10.0
                    )
                    if leaderboard_response.status_code == 200:
                        leaderboard_data = leaderboard_response.json()
                        # Find user's rank in leaderboard
                        for entry in leaderboard_data.get("leaderboard", []):
                            if str(entry.get("userId")) == str(userId):
                                web_stats["rank"] = entry.get("rank")
                                logging.info(f"User {userId} rank: {web_stats['rank']}")
                                break
                except Exception as rank_error:
                    logging.warning(f"Could not fetch rank from leaderboard: {rank_error}")
                    
        except Exception as web_error:
            logging.warning(f"Could not fetch from web API: {web_error}, using local fallback")
        
        # Also calculate from local MongoDB as fallback
        from datetime import timezone
        cursor = db.user_progress.find({"userId": userId})
        
        local_total_points = 0
        local_weekly_points = 0
        one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        
        async for doc in cursor:
            local_total_points += doc.get("totalPoints", 0)
            
            for stage_key, stage_data in doc.get("completedStages", {}).items():
                completed_at = stage_data.get("completedAt")
                if completed_at:
                    try:
                        if isinstance(completed_at, str):
                            completed_date = datetime.fromisoformat(completed_at)
                        else:
                            completed_date = completed_at
                        
                        if completed_date >= one_week_ago:
                            local_weekly_points += stage_data.get("pointsEarned", 0)
                    except Exception as e:
                        logging.warning(f"Error parsing completedAt date: {e}")
                        continue
        
        # Use web API stats if available, otherwise use local
        final_total = web_stats.get("totalPoints", 0) or local_total_points
        final_weekly = web_stats.get("weeklyPoints", 0) or local_weekly_points
        final_rank = web_stats.get("rank")
        
        return JSONResponse({
            "totalPoints": final_total,
            "weeklyPoints": final_weekly,
            "rank": final_rank,
            "userId": userId
        })
    except Exception as e:
        logging.error(f"Error fetching user stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/progress/{userId}/all")
async def get_all_user_progress(userId: str):
    """Get all progress for a user across all modules"""
    try:
        cursor = db.user_progress.find({"userId": userId})
        progress_list = []
        
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            if doc.get("lastAccessed"):
                doc["lastAccessed"] = doc["lastAccessed"].isoformat()
            progress_list.append(doc)
        
        return JSONResponse({"progress": progress_list})
    except Exception as e:
        logging.error(f"Error fetching all progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/proxy/cards/{card_id}")
async def get_card_by_id(card_id: str, authorization: str = Header(None)):
    """Proxy request to get individual card details from web API"""
    try:
        headers = {}
        if authorization:
            headers["Authorization"] = authorization
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{WEB_API_BASE_URL}/cards/{card_id}",
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to fetch card {card_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch card: {str(e)}")

@api_router.post("/proxy/extract-text")
async def extract_text_from_file(file: UploadFile = File(...), authorization: str = Header(None)):
    """Extract text from uploaded image or PDF file"""
    try:
        logger.info(f"[EXTRACT_TEXT] Received file: {file.filename}, type: {file.content_type}")
        
        headers = {}
        if authorization:
            headers["Authorization"] = authorization
        
        # Read file content
        file_content = await file.read()
        logger.info(f"[EXTRACT_TEXT] File size: {len(file_content)} bytes")
        
        # Prepare multipart form data
        files = {"file": (file.filename, file_content, file.content_type)}
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{WEB_API_BASE_URL}/extract-text",
                headers=headers,
                files=files,
                timeout=30.0
            )
            
            logger.info(f"[EXTRACT_TEXT] Web API response status: {response.status_code}")
            
            if response.status_code >= 400:
                logger.error(f"[EXTRACT_TEXT] Web API error: {response.text}")
            
            response.raise_for_status()
            result = response.json()
            logger.info(f"[EXTRACT_TEXT] Extracted text length: {len(result.get('text', ''))}")
            return result
    except httpx.HTTPStatusError as e:
        logger.error(f"[EXTRACT_TEXT] HTTP error {e.response.status_code}: {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=f"Failed to extract text: {e.response.text}")
    except Exception as e:
        logger.error(f"[EXTRACT_TEXT] Unexpected error: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to extract text: {str(e)}")

@api_router.post("/proxy/parse-cards")
async def parse_cards_from_text(request: Request, authorization: str = Header(None)):
    """Parse text content into card suggestions"""
    try:
        headers = {"Content-Type": "application/json"}
        if authorization:
            headers["Authorization"] = authorization
        
        # Get request body
        body = await request.json()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{WEB_API_BASE_URL}/parse-cards",
                headers=headers,
                json=body,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to parse cards: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse cards: {str(e)}")

@api_router.post("/proxy/modules/from-text")
async def create_module_from_text(request: Request, authorization: str = Header(None)):
    """Create module from text content - server handles card splitting"""
    try:
        headers = {"Content-Type": "application/json"}
        if authorization:
            headers["Authorization"] = authorization
        
        # Get request body
        body = await request.json()
        logger.info("[FROM_TEXT] Creating module from text")
        logger.info(f"[FROM_TEXT] Authorization header present: {bool(authorization)}")
        logger.info(f"[FROM_TEXT] Payload keys: {list(body.keys())}")
        logger.info(f"[FROM_TEXT] Content length: {len(body.get('content', ''))} characters")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{WEB_API_BASE_URL}/modules/from-text",
                headers=headers,
                json=body,
                timeout=30.0
            )
            
            logger.info(f"[FROM_TEXT] Web API response status: {response.status_code}")
            
            if response.status_code >= 400:
                logger.error(f"[FROM_TEXT] Web API error response: {response.text}")
            
            response.raise_for_status()
            result = response.json()
            logger.info(f"[FROM_TEXT] Success! Module created: {result.get('id', 'N/A')}")
            return result
    except httpx.HTTPStatusError as e:
        logger.error(f"[FROM_TEXT] HTTP error {e.response.status_code}")
        logger.error(f"[FROM_TEXT] Error response body: {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=f"Failed to create module: {e.response.text}")
    except Exception as e:
        logger.error(f"[FROM_TEXT] Unexpected error: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create module: {str(e)}")

@api_router.post("/proxy/modules/create")
async def create_module_with_assignment(request: Request, authorization: str = Header(None)):
    """Create module with assignment options (for admins/learners)"""
    try:
        headers = {"Content-Type": "application/json"}
        if authorization:
            headers["Authorization"] = authorization
        
        # Get request body with assignment fields
        body = await request.json()
        logger.info("[MODULE_CREATE] Received request to create module")
        logger.info(f"[MODULE_CREATE] Authorization header present: {bool(authorization)}")
        logger.info(f"[MODULE_CREATE] Payload structure: {json.dumps(body, indent=2)}")
        logger.info(f"[MODULE_CREATE] Payload keys: {list(body.keys())}")
        logger.info(f"[MODULE_CREATE] Number of cards: {len(body.get('cards', []))}")
        if body.get('cards'):
            logger.info(f"[MODULE_CREATE] First card structure: {json.dumps(body['cards'][0], indent=2)}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{WEB_API_BASE_URL}/modules",
                headers=headers,
                json=body,
                timeout=30.0
            )
            
            logger.info(f"[MODULE_CREATE] Web API response status: {response.status_code}")
            
            if response.status_code >= 400:
                logger.error(f"[MODULE_CREATE] Web API error response: {response.text}")
                logger.error(f"[MODULE_CREATE] Request headers sent: {headers}")
                logger.error(f"[MODULE_CREATE] Full payload sent: {json.dumps(body, indent=2)}")
            
            response.raise_for_status()
            result = response.json()
            logger.info(f"[MODULE_CREATE] Success! Module created: {result.get('id', 'N/A')}")
            return result
    except httpx.HTTPStatusError as e:
        logger.error(f"[MODULE_CREATE] HTTP error {e.response.status_code}")
        logger.error(f"[MODULE_CREATE] Error response body: {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=f"Failed to create module: {e.response.text}")
    except Exception as e:
        logger.error(f"[MODULE_CREATE] Unexpected error: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create module: {str(e)}")

@api_router.get("/proxy/organizations/{org_id}/users")
async def get_organization_users(org_id: str, authorization: str = Header(None)):
    """Get list of users in an organization (for admin assignment)"""
    try:
        headers = {}
        if authorization:
            headers["Authorization"] = authorization
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{WEB_API_BASE_URL}/organizations/{org_id}/users",
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()
            
            # Check if response has content
            if not response.text or response.text.strip() == "":
                logger.warning("Empty response from org users endpoint")
                return {"users": []}
            
            return response.json()
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error getting org users: {e.response.status_code}")
        raise HTTPException(status_code=e.response.status_code, detail="Failed to get organization users")
    except Exception as e:
        logger.error(f"Failed to get organization users: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get organization users: {str(e)}")

@api_router.get("/proxy/mobile/leaderboard")
async def get_mobile_leaderboard(
    timeframe: str = Query(default="alltime"),
    authorization: str = Header(None)
):
    """Proxy leaderboard requests to web API with authentication, fallback to local data"""
    try:
        headers = {"Authorization": authorization} if authorization else {}
        
        # Try to fetch from web API first
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://irememberit.replit.app/api/mobile/leaderboard?timeframe={timeframe}",
                    headers=headers,
                    timeout=10.0
                )
                logging.info(f"Leaderboard API response: {response.status_code}")
                logging.info(f"Leaderboard response text: {response.text[:200]}")
                
                if response.status_code == 200 and response.text.strip():
                    leaderboard_data = response.json()
                    if leaderboard_data.get("leaderboard") and len(leaderboard_data.get("leaderboard", [])) > 0:
                        logging.info(f"Using web API leaderboard with {len(leaderboard_data.get('leaderboard', []))} entries")
                        return JSONResponse(leaderboard_data)
        except Exception as web_error:
            logging.warning(f"Web API leaderboard failed: {web_error}")
        
        # Fallback: Build leaderboard from local MongoDB data
        logging.info("Building leaderboard from local data...")
        
        # Get all users with progress
        all_progress = await db.user_progress.find().to_list(length=1000)
        
        # Aggregate points by user
        user_totals = {}
        for progress in all_progress:
            user_id = progress.get("userId")
            total_points = progress.get("totalPoints", 0)
            
            if user_id in user_totals:
                user_totals[user_id] += total_points
            else:
                user_totals[user_id] = total_points
        
        # Sort by points descending
        sorted_users = sorted(user_totals.items(), key=lambda x: x[1], reverse=True)
        
        # Build leaderboard array
        leaderboard = []
        for rank, (user_id, total_points) in enumerate(sorted_users, 1):
            leaderboard.append({
                "userId": user_id,
                "rank": rank,
                "totalPoints": total_points,
                "name": None,  # We don't have names in local DB
                "email": None  # We don't have emails in local DB
            })
        
        logging.info(f"Built local leaderboard with {len(leaderboard)} users")
        
        return JSONResponse({
            "leaderboard": leaderboard,
            "source": "local"  # Indicate this is local data
        })
            
    except Exception as e:
        logging.error(f"Error in leaderboard endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/proxy/streak")
async def get_streak(authorization: str = Header(None)):
    """Proxy streak requests to web API with authentication"""
    try:
        headers = {}
        if authorization:
            headers["Authorization"] = authorization
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{WEB_API_BASE_URL}/streak",
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()
            logger.info(f"Streak data received: {json.dumps(data, indent=2)}")
            return data
    except Exception as e:
        logger.error(f"Failed to get streak: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get streak: {str(e)}")

@api_router.get("/progress/{userId}/{moduleId}")
async def get_user_progress(userId: str, moduleId: str):
    """Get user's progress for a specific module - syncs with web API"""
    try:
        # First, try to fetch from web API to get latest progress
        web_progress = None
        try:
            async with httpx.AsyncClient() as client:
                web_response = await client.get(
                    f"https://irememberit.replit.app/api/mobile/progress/{userId}/{moduleId}",
                    timeout=10.0
                )
                if web_response.status_code == 200:
                    web_progress = web_response.json()
                    logging.info(f"Fetched progress from web API for module {moduleId}")
                else:
                    logging.warning(f"Web API progress returned {web_response.status_code}")
        except Exception as web_error:
            logging.warning(f"Could not fetch progress from web API: {web_error}")
        
        # Also get local progress
        local_progress = await db.user_progress.find_one({
            "userId": userId,
            "moduleId": moduleId
        })
        
        # Merge web and local progress (web takes precedence)
        if web_progress:
            # Use web progress and merge with local
            merged_progress = web_progress
            
            # Add any local stages that aren't in web
            if local_progress:
                local_stages = local_progress.get("completedStages", {})
                web_stages = web_progress.get("completedStages", {})
                for stage_key, stage_data in local_stages.items():
                    if stage_key not in web_stages:
                        web_stages[stage_key] = stage_data
                merged_progress["completedStages"] = web_stages
            
            return JSONResponse(merged_progress)
        elif local_progress:
            # Use local progress as fallback
            local_progress["_id"] = str(local_progress["_id"])
            if local_progress.get("lastAccessed"):
                local_progress["lastAccessed"] = local_progress["lastAccessed"].isoformat()
            return JSONResponse(local_progress)
        else:
            # No progress found anywhere
            return JSONResponse({
                "userId": userId,
                "moduleId": moduleId,
                "completedStages": {},
                "totalPoints": 0,
                "highestStage": 1,
                "lastAccessed": None
            })
    except Exception as e:
        logging.error(f"Error fetching progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Subscription proxy endpoints (must be before general proxy to avoid conflicts)
@api_router.get("/proxy/subscription/current")
async def proxy_get_current_subscription(authorization: str = Header(None)):
    """Proxy: Get current subscription details for user or organization"""
    return await get_current_subscription(authorization)

@api_router.post("/proxy/subscription/create-checkout")
async def proxy_create_checkout_session(request: Request, authorization: str = Header(None)):
    """Proxy: Create Stripe checkout session"""
    return await create_checkout_session(request, authorization)

@api_router.post("/proxy/subscription/cancel")
async def proxy_cancel_subscription(authorization: str = Header(None)):
    """Proxy: Cancel subscription"""
    return await cancel_subscription(authorization)

@api_router.get("/proxy/subscription/invoices")
async def proxy_get_billing_invoices(authorization: str = Header(None)):
    """Proxy: Get billing invoices"""
    return await get_billing_invoices(authorization)

@api_router.post("/proxy/subscription/user-seats")
async def proxy_update_user_seats(request: Request, authorization: str = Header(None)):
    """Proxy: Update user seats"""
    return await update_user_seats(request, authorization)

@api_router.post("/proxy/subscription/validate-promo")
async def proxy_validate_promo_code(request: Request, authorization: str = Header(None)):
    """Proxy: Validate promo code"""
    return await validate_promo_code(request, authorization)

@api_router.post("/proxy/subscription/apply-promo")
async def proxy_apply_promo_code(request: Request, authorization: str = Header(None)):
    """Proxy: Apply promo code"""
    return await apply_promo_code(request, authorization)

# Proxy endpoints for iRememberIt API (to bypass CORS)
@api_router.api_route("/proxy/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_to_irememberit(path: str, request: Request):
    """Proxy all requests to iRememberIt API to bypass CORS"""
    try:
        # Get the request body
        body = await request.body()
        
        # Get all headers except host
        headers = dict(request.headers)
        headers.pop('host', None)
        
        # Construct the target URL
        target_url = f"{IREMEMBERIT_API}/{path}"
        
        # Forward the request
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(
                method=request.method,
                url=target_url,
                content=body,
                headers=headers,
            )
            
            # Return the response
            # Handle empty or invalid JSON responses
            content = {}
            if response.text and response.text.strip():
                try:
                    content = response.json()
                    logging.info(f"Proxy response content: {content}")
                except ValueError:
                    logging.warning(f"Failed to parse JSON from response: '{response.text}'")
                    # If JSON parsing fails, return empty dict for successful responses
                    if response.status_code == 200:
                        content = {"verified": False, "message": "Awaiting verification"}
                    else:
                        content = {"error": "Invalid response format"}
            else:
                logging.info(f"Empty response body for {path}, status: {response.status_code}")
                if response.status_code == 200:
                    content = {"verified": False, "message": "Awaiting verification"}
            
            return JSONResponse(
                content=content,
                status_code=response.status_code
            )
    except Exception as e:
        logging.error(f"Proxy error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Auth Endpoints
@api_router.post("/proxy/mobile/auth/signup")
async def signup_user(request: Request):
    """Proxy signup requests to web API"""
    try:
        body = await request.json()
        logger.info(f"Signup request received for email: {body.get('email')}")
        logger.info(f"Signup payload: {body}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{WEB_API_BASE_URL}/mobile/auth/signup",
                json=body,
                timeout=10.0
            )
            
            # Log response details
            logger.info(f"Web API response status: {response.status_code}")
            logger.info(f"Web API response body: {response.text}")
            
            response.raise_for_status()
            data = response.json()
            logger.info(f"Signup successful for: {body.get('email')}")
            return data
    except httpx.HTTPStatusError as e:
        error_detail = e.response.text
        logger.error(f"Signup failed with status {e.response.status_code}")
        logger.error(f"Error response: {error_detail}")
        raise HTTPException(status_code=e.response.status_code, detail=error_detail)
    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/proxy/auth/check-verification")
async def check_verification(request: Request):
    """Check if email is verified"""
    try:
        body = await request.json()
        email = body.get('email')
        logger.info(f"Checking verification for email: {email}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{WEB_API_BASE_URL}/auth/check-verification",
                json=body,
                timeout=10.0
            )
            
            logger.info(f"Verification check response status: {response.status_code}")
            logger.info(f"Verification check response text: {response.text}")
            
            response.raise_for_status()
            
            # Handle empty response from web API
            if not response.text or response.text.strip() == '':
                logger.info(f"Empty response for {email}, returning not verified")
                return {"verified": False, "message": "Email not verified yet"}
            
            try:
                data = response.json()
                logger.info(f"Verification status for {email}: {data}")
                return data
            except ValueError as e:
                logger.error(f"Failed to parse JSON response: {response.text}")
                return {"verified": False, "message": "Email not verified yet"}
                
    except httpx.HTTPStatusError as e:
        error_detail = e.response.text
        logger.error(f"Verification check failed with status {e.response.status_code}")
        logger.error(f"Error response: {error_detail}")
        raise HTTPException(status_code=e.response.status_code, detail=error_detail)
    except Exception as e:
        logger.error(f"Verification check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# User Profile Endpoints
@api_router.get("/proxy/auth/user")
async def get_user_profile(authorization: str = Header(None)):
    """Get user profile"""
    try:
        headers = {}
        if authorization:
            headers["Authorization"] = authorization
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{WEB_API_BASE_URL}/auth/user",
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()
            user_data = response.json()
            logger.info(f"User profile data: {user_data}")
            logger.info(f"User tier: {user_data.get('tier', 'NOT FOUND')}")
            return user_data
    except Exception as e:
        logger.error(f"Failed to get user profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user profile: {str(e)}")

@api_router.patch("/proxy/auth/profile")
async def update_user_profile(request: Request, authorization: str = Header(None)):
    """Update user profile"""
    try:
        headers = {"Content-Type": "application/json"}
        if authorization:
            headers["Authorization"] = authorization
        
        body = await request.json()
        logger.info(f"Updating user profile: {body}")
        
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{WEB_API_BASE_URL}/auth/profile",
                headers=headers,
                json=body,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to update user profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update user profile: {str(e)}")

# Organization Endpoints
@api_router.get("/proxy/organization")
async def get_organization(authorization: str = Header(None)):
    """Get organization details"""
    try:
        headers = {}
        if authorization:
            headers["Authorization"] = authorization
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{WEB_API_BASE_URL}/organization",
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to get organization: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get organization: {str(e)}")

@api_router.get("/proxy/organization/usage")
async def get_organization_usage(authorization: str = Header(None)):
    """Get organization usage and limits"""
    try:
        headers = {}
        if authorization:
            headers["Authorization"] = authorization
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{WEB_API_BASE_URL}/organization/usage",
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to get organization usage: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get organization usage: {str(e)}")

@api_router.patch("/proxy/organization/name")
async def update_organization_name(request: Request, authorization: str = Header(None)):
    """Update organization name"""
    try:
        headers = {"Content-Type": "application/json"}
        if authorization:
            headers["Authorization"] = authorization
        
        body = await request.json()
        logger.info(f"Updating organization name: {body}")
        
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{WEB_API_BASE_URL}/organization/name",
                headers=headers,
                json=body,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to update organization name: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update organization name: {str(e)}")

# Announcements Endpoints
@api_router.get("/proxy/announcements")
async def get_announcements(authorization: str = Header(None)):
    """Get organization announcements"""
    try:
        headers = {}
        if authorization:
            headers["Authorization"] = authorization
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{WEB_API_BASE_URL}/announcements",
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to get announcements: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get announcements: {str(e)}")

@api_router.post("/proxy/announcements")
async def create_announcement(request: Request, authorization: str = Header(None)):
    """Create announcement (admin only)"""
    try:
        headers = {"Content-Type": "application/json"}
        if authorization:
            headers["Authorization"] = authorization
        
        body = await request.json()
        logger.info(f"Creating announcement: {body}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{WEB_API_BASE_URL}/announcements",
                headers=headers,
                json=body,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to create announcement: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create announcement: {str(e)}")

@api_router.post("/proxy/announcements/{announcement_id}/mark-read")
async def mark_announcement_read(announcement_id: str, authorization: str = Header(None)):
    """Mark announcement as read"""
    try:
        headers = {}
        if authorization:
            headers["Authorization"] = authorization
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{WEB_API_BASE_URL}/announcements/{announcement_id}/mark-read",
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to mark announcement as read: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to mark announcement as read: {str(e)}")

# Push Notifications Endpoints
@api_router.post("/proxy/push-tokens")
async def register_push_token(request: Request, authorization: str = Header(None)):
    """Register push notification token"""
    try:
        headers = {"Content-Type": "application/json"}
        if authorization:
            headers["Authorization"] = authorization
        
        body = await request.json()
        logger.info(f"Registering push token: {body.get('token', '')[:20]}...")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{WEB_API_BASE_URL}/push-tokens",
                headers=headers,
                json=body,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to register push token: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to register push token: {str(e)}")

@api_router.delete("/proxy/push-tokens/{token}")
async def delete_push_token(token: str, authorization: str = Header(None)):
    """Delete push notification token"""
    try:
        headers = {}
        if authorization:
            headers["Authorization"] = authorization
        
        logger.info(f"Deleting push token: {token[:20]}...")
        
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{WEB_API_BASE_URL}/push-tokens/{token}",
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to delete push token: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete push token: {str(e)}")

# Subscription endpoints
@api_router.get("/subscription/current")
async def get_current_subscription(authorization: str = Header(None)):
    """Get current subscription details for user or organization"""
    try:
        headers = {}
        if authorization:
            headers["Authorization"] = authorization
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{WEB_API_BASE_URL}/subscription/current",
                headers=headers,
                timeout=10.0
            )
            
            logger.info(f"Subscription response status: {response.status_code}")
            logger.info(f"Subscription response text: {response.text}")
            
            response.raise_for_status()
            
            # Handle empty response
            if not response.text or response.text.strip() == "":
                logger.warning("Empty response from subscription endpoint")
                return {"subscription": None, "status": "no_subscription"}
            
            try:
                data = response.json()
                logger.info(f"Subscription data received: {json.dumps(data, indent=2)}")
                return data
            except json.JSONDecodeError as json_error:
                logger.error(f"Failed to parse JSON response: {json_error}")
                logger.error(f"Raw response: {response.text}")
                return {"subscription": None, "status": "parse_error", "raw_response": response.text}
    except httpx.HTTPStatusError as e:
        error_detail = e.response.text
        logger.error(f"Subscription request failed with status {e.response.status_code}")
        logger.error(f"Error response: {error_detail}")
        raise HTTPException(status_code=e.response.status_code, detail=error_detail)
    except Exception as e:
        logger.error(f"Failed to get subscription: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get subscription: {str(e)}")

# Proxy endpoint moved to before general proxy

@api_router.post("/subscription/create-checkout")
async def create_checkout_session(request: Request, authorization: str = Header(None)):
    """Create Stripe checkout session"""
    try:
        headers = {"Content-Type": "application/json"}
        if authorization:
            headers["Authorization"] = authorization
        
        body = await request.json()
        logger.info(f"Creating checkout session for tier: {body.get('tier')}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{WEB_API_BASE_URL}/create-checkout-session",
                json=body,
                headers=headers,
                timeout=30.0
            )
            
            logger.info(f"Checkout response status: {response.status_code}")
            logger.info(f"Checkout response: {response.text[:500]}")
            
            response.raise_for_status()
            data = response.json()
            logger.info("Checkout session created successfully")
            return data
    except httpx.HTTPStatusError as e:
        error_detail = e.response.text
        logger.error(f"Checkout failed with status {e.response.status_code}")
        logger.error(f"Error response: {error_detail}")
        raise HTTPException(status_code=e.response.status_code, detail=error_detail)
    except Exception as e:
        logger.error(f"Failed to create checkout session: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create checkout session: {str(e)}")

@api_router.post("/subscription/cancel")
async def cancel_subscription(authorization: str = Header(None)):
    """Cancel subscription at end of period"""
    try:
        headers = {}
        if authorization:
            headers["Authorization"] = authorization
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{WEB_API_BASE_URL}/cancel-subscription",
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to cancel subscription: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to cancel subscription: {str(e)}")

@api_router.get("/subscription/invoices")
async def get_billing_invoices(authorization: str = Header(None)):
    """Get billing invoices"""
    try:
        headers = {}
        if authorization:
            headers["Authorization"] = authorization
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{WEB_API_BASE_URL}/billing/invoices",
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to get invoices: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get invoices: {str(e)}")

@api_router.post("/subscription/user-seats")
async def update_user_seats(request: Request, authorization: str = Header(None)):
    """Update user seats for enterprise tier"""
    try:
        headers = {"Content-Type": "application/json"}
        if authorization:
            headers["Authorization"] = authorization
        
        body = await request.json()
        logger.info(f"Updating user seats to: {body.get('userCount')}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{WEB_API_BASE_URL}/organization/user-seats",
                json=body,
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to update user seats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update user seats: {str(e)}")

@api_router.post("/subscription/validate-promo")
async def validate_promo_code(request: Request, authorization: str = Header(None)):
    """Validate promo code"""
    try:
        headers = {"Content-Type": "application/json"}
        if authorization:
            headers["Authorization"] = authorization
        
        body = await request.json()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{WEB_API_BASE_URL}/validate-promo-code",
                json=body,
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to validate promo code: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to validate promo code: {str(e)}")

@api_router.post("/subscription/apply-promo")
async def apply_promo_code(request: Request, authorization: str = Header(None)):
    """Apply promo code"""
    try:
        headers = {"Content-Type": "application/json"}
        if authorization:
            headers["Authorization"] = authorization
        
        body = await request.json()
        promo_code = body.get('code')
        logger.info(f"Applying promo code: {promo_code}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{WEB_API_BASE_URL}/apply-promo-code",
                json=body,
                headers=headers,
                timeout=10.0
            )
            
            logger.info(f"Promo code response status: {response.status_code}")
            logger.info(f"Promo code response body: {response.text}")
            
            response.raise_for_status()
            data = response.json()
            logger.info(f"Promo code applied successfully: {promo_code}")
            return data
    except httpx.HTTPStatusError as e:
        error_detail = e.response.text
        logger.error(f"Promo code failed with status {e.response.status_code}")
        logger.error(f"Error response: {error_detail}")
        raise HTTPException(status_code=e.response.status_code, detail=error_detail)
    except Exception as e:
        logger.error(f"Failed to apply promo code: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to apply promo code: {str(e)}")

# Proxy endpoints moved to before general proxy

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
