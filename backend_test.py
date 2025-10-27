#!/usr/bin/env python3
"""
Backend API Testing Suite for iRememberIt Mobile App
Focus: Leaderboard endpoint testing with fallback scenarios
"""

import asyncio
import httpx
import json
import logging
from datetime import datetime
import os
import sys
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Get backend URL from frontend .env file
def get_backend_url():
    frontend_env_path = Path("/app/frontend/.env")
    if frontend_env_path.exists():
        with open(frontend_env_path, 'r') as f:
            for line in f:
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    return "https://touchupui.preview.emergentagent.com"  # fallback

BACKEND_URL = get_backend_url()
API_BASE = f"{BACKEND_URL}/api"

class LeaderboardTester:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.test_results = []
        
    async def close(self):
        await self.client.aclose()
    
    def log_test_result(self, test_name, success, details=""):
        """Log test result for summary"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details
        })
        logger.info(f"{status}: {test_name} - {details}")
    
    async def test_leaderboard_without_auth(self):
        """Test leaderboard endpoint without authentication token"""
        test_name = "Leaderboard without authentication"
        try:
            response = await self.client.get(f"{API_BASE}/proxy/mobile/leaderboard")
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                if "leaderboard" in data and isinstance(data["leaderboard"], list):
                    # Check if fallback to local data worked
                    if "source" in data and data["source"] == "local":
                        self.log_test_result(test_name, True, f"Fallback to local data successful, {len(data['leaderboard'])} entries")
                    else:
                        self.log_test_result(test_name, True, f"Web API response successful, {len(data['leaderboard'])} entries")
                    
                    # Verify leaderboard structure if entries exist
                    if data["leaderboard"]:
                        entry = data["leaderboard"][0]
                        required_fields = ["userId", "rank", "totalPoints"]
                        missing_fields = [field for field in required_fields if field not in entry]
                        
                        if missing_fields:
                            self.log_test_result(f"{test_name} - Structure", False, f"Missing fields: {missing_fields}")
                        else:
                            # Verify ranking order
                            is_sorted = all(
                                data["leaderboard"][i]["totalPoints"] >= data["leaderboard"][i+1]["totalPoints"]
                                for i in range(len(data["leaderboard"])-1)
                            )
                            if is_sorted:
                                self.log_test_result(f"{test_name} - Sorting", True, "Leaderboard properly sorted by points")
                            else:
                                self.log_test_result(f"{test_name} - Sorting", False, "Leaderboard not sorted correctly")
                    
                    return True
                else:
                    self.log_test_result(test_name, False, f"Invalid response structure: {data}")
                    return False
            else:
                self.log_test_result(test_name, False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {str(e)}")
            return False

    async def test_leaderboard_with_fake_auth(self):
        """Test leaderboard endpoint with fake authentication token"""
        test_name = "Leaderboard with fake auth token"
        try:
            headers = {"Authorization": "Bearer fake-token-12345"}
            response = await self.client.get(f"{API_BASE}/proxy/mobile/leaderboard", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Should fallback to local data when web API fails with fake token
                if "leaderboard" in data and isinstance(data["leaderboard"], list):
                    if "source" in data and data["source"] == "local":
                        self.log_test_result(test_name, True, "Correctly fell back to local data with invalid token")
                    else:
                        self.log_test_result(test_name, True, "Web API accepted fake token (unexpected but handled)")
                    return True
                else:
                    self.log_test_result(test_name, False, f"Invalid response structure: {data}")
                    return False
            else:
                self.log_test_result(test_name, False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {str(e)}")
            return False

    async def test_leaderboard_timeframes(self):
        """Test leaderboard endpoint with different timeframe parameters"""
        timeframes = ["alltime", "week", "month"]
        
        for timeframe in timeframes:
            test_name = f"Leaderboard timeframe: {timeframe}"
            try:
                response = await self.client.get(f"{API_BASE}/proxy/mobile/leaderboard?timeframe={timeframe}")
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if "leaderboard" in data and isinstance(data["leaderboard"], list):
                        self.log_test_result(test_name, True, f"Timeframe {timeframe} works, {len(data['leaderboard'])} entries")
                    else:
                        self.log_test_result(test_name, False, f"Invalid response structure for {timeframe}")
                else:
                    self.log_test_result(test_name, False, f"HTTP {response.status_code} for timeframe {timeframe}")
                    
            except Exception as e:
                self.log_test_result(test_name, False, f"Exception with {timeframe}: {str(e)}")

    async def test_leaderboard_response_validation(self):
        """Test detailed response validation for leaderboard"""
        test_name = "Leaderboard response validation"
        try:
            response = await self.client.get(f"{API_BASE}/proxy/mobile/leaderboard")
            
            if response.status_code != 200:
                self.log_test_result(test_name, False, f"HTTP {response.status_code}")
                return False
            
            # Verify it's valid JSON
            try:
                data = response.json()
            except json.JSONDecodeError as e:
                self.log_test_result(test_name, False, f"Invalid JSON response: {str(e)}")
                return False
            
            # Verify required top-level structure
            if not isinstance(data, dict):
                self.log_test_result(test_name, False, "Response is not a JSON object")
                return False
            
            if "leaderboard" not in data:
                self.log_test_result(test_name, False, "Missing 'leaderboard' field")
                return False
            
            if not isinstance(data["leaderboard"], list):
                self.log_test_result(test_name, False, "'leaderboard' is not an array")
                return False
            
            # If leaderboard has entries, validate structure
            if data["leaderboard"]:
                for i, entry in enumerate(data["leaderboard"]):
                    if not isinstance(entry, dict):
                        self.log_test_result(test_name, False, f"Entry {i} is not an object")
                        return False
                    
                    # Check required fields
                    required_fields = ["userId", "rank", "totalPoints"]
                    for field in required_fields:
                        if field not in entry:
                            self.log_test_result(test_name, False, f"Entry {i} missing field: {field}")
                            return False
                    
                    # Validate field types
                    if not isinstance(entry["rank"], int) or entry["rank"] < 1:
                        self.log_test_result(test_name, False, f"Entry {i} has invalid rank: {entry['rank']}")
                        return False
                    
                    if not isinstance(entry["totalPoints"], (int, float)) or entry["totalPoints"] < 0:
                        self.log_test_result(test_name, False, f"Entry {i} has invalid totalPoints: {entry['totalPoints']}")
                        return False
                
                # Verify ranks are sequential (1, 2, 3, ...)
                expected_ranks = list(range(1, len(data["leaderboard"]) + 1))
                actual_ranks = [entry["rank"] for entry in data["leaderboard"]]
                
                if actual_ranks != expected_ranks:
                    self.log_test_result(test_name, False, f"Ranks not sequential. Expected: {expected_ranks}, Got: {actual_ranks}")
                    return False
            
            self.log_test_result(test_name, True, f"Response structure valid, {len(data['leaderboard'])} entries")
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {str(e)}")
            return False

    async def test_leaderboard_error_handling(self):
        """Test error handling scenarios"""
        test_name = "Leaderboard error handling"
        try:
            # Test with malformed parameters
            response = await self.client.get(f"{API_BASE}/proxy/mobile/leaderboard?timeframe=invalid_timeframe")
            
            # Should still return 200 with fallback data, not crash
            if response.status_code == 200:
                data = response.json()
                if "leaderboard" in data:
                    self.log_test_result(test_name, True, "Handles invalid timeframe gracefully")
                else:
                    self.log_test_result(test_name, False, "Invalid timeframe caused malformed response")
            else:
                # If it returns an error, that's also acceptable as long as it's not a 500
                if response.status_code == 500:
                    self.log_test_result(test_name, False, f"Server error with invalid timeframe: {response.text}")
                else:
                    self.log_test_result(test_name, True, f"Properly rejected invalid timeframe with {response.status_code}")
            
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, f"Exception: {str(e)}")
            return False

    async def run_all_tests(self):
        """Run all leaderboard tests"""
        logger.info("🚀 Starting Leaderboard Endpoint Testing...")
        logger.info(f"Testing against: {API_BASE}")
        
        # Test basic functionality
        await self.test_leaderboard_without_auth()
        await self.test_leaderboard_with_fake_auth()
        
        # Test different timeframes
        await self.test_leaderboard_timeframes()
        
        # Test response validation
        await self.test_leaderboard_response_validation()
        
        # Test error handling
        await self.test_leaderboard_error_handling()
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        logger.info("\n" + "="*60)
        logger.info("🏆 LEADERBOARD ENDPOINT TEST SUMMARY")
        logger.info("="*60)
        logger.info(f"Total Tests: {total_tests}")
        logger.info(f"✅ Passed: {passed_tests}")
        logger.info(f"❌ Failed: {failed_tests}")
        logger.info(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            logger.info("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    logger.info(f"  • {result['test']}: {result['details']}")
        
        logger.info("="*60)

async def main():
    """Main test runner"""
    tester = LeaderboardTester()
    
    try:
        await tester.run_all_tests()
    finally:
        await tester.close()

if __name__ == "__main__":
    asyncio.run(main())