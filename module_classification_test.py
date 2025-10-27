#!/usr/bin/env python3
"""
Module Classification Data Analysis Test

This script tests the /mobile/sync/initial endpoint to determine the actual 
structure of module data returned by the web API to fix module classification 
on the home screen.

Test Objective: Examine module fields to understand correct classification logic
"""

import asyncio
import httpx
import json
import os
from datetime import datetime
from typing import Dict, List, Any, Optional

# Configuration
WEB_API_BASE_URL = "https://irememberit.replit.app/api"
BACKEND_URL = "https://recall-app-update.preview.emergentagent.com/api"

class ModuleClassificationTester:
    def __init__(self):
        self.results = {
            "test_timestamp": datetime.now().isoformat(),
            "endpoint_tested": "/mobile/sync/initial",
            "web_api_url": WEB_API_BASE_URL,
            "backend_url": BACKEND_URL,
            "tests_performed": [],
            "module_analysis": {},
            "classification_recommendations": []
        }
    
    async def test_direct_web_api_call(self):
        """Test direct call to web API /mobile/sync/initial endpoint"""
        test_result = {
            "test_name": "Direct Web API Call",
            "description": "Test /mobile/sync/initial endpoint directly",
            "status": "failed",
            "error": None,
            "response_data": None,
            "modules_found": 0,
            "module_fields_analysis": {}
        }
        
        try:
            print("🔍 Testing direct call to web API /mobile/sync/initial...")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{WEB_API_BASE_URL}/mobile/sync/initial")
                
                print(f"   Status Code: {response.status_code}")
                print(f"   Response Headers: {dict(response.headers)}")
                
                if response.status_code == 401:
                    test_result["status"] = "auth_required"
                    test_result["error"] = "Authentication required - 401 Unauthorized"
                    print("   ❌ Authentication required (401) - This is expected for protected endpoints")
                    
                elif response.status_code == 200:
                    try:
                        data = response.json()
                        test_result["status"] = "success"
                        test_result["response_data"] = data
                        
                        # Analyze modules if present
                        modules = data.get("modules", [])
                        test_result["modules_found"] = len(modules)
                        
                        if modules:
                            test_result["module_fields_analysis"] = self.analyze_module_fields(modules)
                            print(f"   ✅ Success! Found {len(modules)} modules")
                        else:
                            print("   ⚠️  Success but no modules found in response")
                            
                    except json.JSONDecodeError as e:
                        test_result["status"] = "invalid_json"
                        test_result["error"] = f"Invalid JSON response: {str(e)}"
                        print(f"   ❌ Invalid JSON response: {e}")
                        
                else:
                    test_result["status"] = "http_error"
                    test_result["error"] = f"HTTP {response.status_code}: {response.text}"
                    print(f"   ❌ HTTP Error {response.status_code}: {response.text}")
                    
        except Exception as e:
            test_result["status"] = "exception"
            test_result["error"] = str(e)
            print(f"   ❌ Exception: {e}")
        
        self.results["tests_performed"].append(test_result)
        return test_result
    
    async def test_backend_proxy_call(self):
        """Test call through our backend proxy"""
        test_result = {
            "test_name": "Backend Proxy Call",
            "description": "Test /mobile/sync/initial through backend proxy",
            "status": "failed",
            "error": None,
            "response_data": None,
            "modules_found": 0,
            "module_fields_analysis": {}
        }
        
        try:
            print("🔍 Testing call through backend proxy...")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{BACKEND_URL}/proxy/mobile/sync/initial")
                
                print(f"   Status Code: {response.status_code}")
                
                if response.status_code == 401:
                    test_result["status"] = "auth_required"
                    test_result["error"] = "Authentication required - 401 Unauthorized"
                    print("   ❌ Authentication required (401)")
                    
                elif response.status_code == 200:
                    try:
                        data = response.json()
                        test_result["status"] = "success"
                        test_result["response_data"] = data
                        
                        # Analyze modules if present
                        modules = data.get("modules", [])
                        test_result["modules_found"] = len(modules)
                        
                        if modules:
                            test_result["module_fields_analysis"] = self.analyze_module_fields(modules)
                            print(f"   ✅ Success! Found {len(modules)} modules")
                        else:
                            print("   ⚠️  Success but no modules found in response")
                            
                    except json.JSONDecodeError as e:
                        test_result["status"] = "invalid_json"
                        test_result["error"] = f"Invalid JSON response: {str(e)}"
                        print(f"   ❌ Invalid JSON response: {e}")
                        
                else:
                    test_result["status"] = "http_error"
                    test_result["error"] = f"HTTP {response.status_code}: {response.text}"
                    print(f"   ❌ HTTP Error {response.status_code}: {response.text}")
                    
        except Exception as e:
            test_result["status"] = "exception"
            test_result["error"] = str(e)
            print(f"   ❌ Exception: {e}")
        
        self.results["tests_performed"].append(test_result)
        return test_result
    
    async def test_backend_status(self):
        """Test if our backend is running"""
        test_result = {
            "test_name": "Backend Status Check",
            "description": "Check if backend is accessible",
            "status": "failed",
            "error": None,
            "backend_accessible": False
        }
        
        try:
            print("🔍 Testing backend accessibility...")
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{BACKEND_URL}/")
                
                print(f"   Status Code: {response.status_code}")
                
                if response.status_code == 200:
                    test_result["status"] = "success"
                    test_result["backend_accessible"] = True
                    print("   ✅ Backend is accessible")
                else:
                    test_result["status"] = "http_error"
                    test_result["error"] = f"HTTP {response.status_code}"
                    print(f"   ❌ Backend returned {response.status_code}")
                    
        except Exception as e:
            test_result["status"] = "exception"
            test_result["error"] = str(e)
            print(f"   ❌ Backend not accessible: {e}")
        
        self.results["tests_performed"].append(test_result)
        return test_result
    
    def analyze_module_fields(self, modules: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze module fields to understand classification structure"""
        analysis = {
            "total_modules": len(modules),
            "field_presence": {},
            "moduleType_values": {},
            "autoAssignToNewUsers_values": {},
            "sample_modules": [],
            "field_combinations": {}
        }
        
        print(f"\n📊 ANALYZING {len(modules)} MODULES:")
        print("=" * 60)
        
        # Track field presence and values
        for i, module in enumerate(modules):
            # Sample first 3 modules for detailed logging
            if i < 3:
                sample_module = {
                    "id": module.get("id"),
                    "title": module.get("title", "No title"),
                    "moduleType": module.get("moduleType"),
                    "autoAssignToNewUsers": module.get("autoAssignToNewUsers"),
                    "createdById": module.get("createdById"),
                    "organizationId": module.get("organizationId"),
                    "isPrivate": module.get("isPrivate"),
                    "all_fields": list(module.keys())
                }
                analysis["sample_modules"].append(sample_module)
                
                print(f"\nModule {i+1}: '{module.get('title', 'No title')}'")
                print(f"  ID: {module.get('id')}")
                print(f"  moduleType: {module.get('moduleType')}")
                print(f"  autoAssignToNewUsers: {module.get('autoAssignToNewUsers')}")
                print(f"  createdById: {module.get('createdById')}")
                print(f"  organizationId: {module.get('organizationId')}")
                print(f"  isPrivate: {module.get('isPrivate')}")
                print(f"  All fields: {list(module.keys())}")
            
            # Track field presence
            for field in ["moduleType", "autoAssignToNewUsers", "createdById", "organizationId", "isPrivate"]:
                if field in module:
                    analysis["field_presence"][field] = analysis["field_presence"].get(field, 0) + 1
            
            # Track moduleType values
            module_type = module.get("moduleType")
            if module_type is not None:
                analysis["moduleType_values"][str(module_type)] = analysis["moduleType_values"].get(str(module_type), 0) + 1
            
            # Track autoAssignToNewUsers values
            auto_assign = module.get("autoAssignToNewUsers")
            if auto_assign is not None:
                analysis["autoAssignToNewUsers_values"][str(auto_assign)] = analysis["autoAssignToNewUsers_values"].get(str(auto_assign), 0) + 1
            
            # Track field combinations for classification
            combo_key = f"moduleType={module_type},autoAssign={auto_assign}"
            analysis["field_combinations"][combo_key] = analysis["field_combinations"].get(combo_key, 0) + 1
        
        print(f"\n📈 FIELD ANALYSIS SUMMARY:")
        print(f"Field Presence (out of {len(modules)} modules):")
        for field, count in analysis["field_presence"].items():
            percentage = (count / len(modules)) * 100
            print(f"  {field}: {count}/{len(modules)} ({percentage:.1f}%)")
        
        print(f"\nmoduleType Values:")
        for value, count in analysis["moduleType_values"].items():
            percentage = (count / len(modules)) * 100
            print(f"  '{value}': {count} modules ({percentage:.1f}%)")
        
        print(f"\nautoAssignToNewUsers Values:")
        for value, count in analysis["autoAssignToNewUsers_values"].items():
            percentage = (count / len(modules)) * 100
            print(f"  {value}: {count} modules ({percentage:.1f}%)")
        
        print(f"\nField Combinations:")
        for combo, count in analysis["field_combinations"].items():
            percentage = (count / len(modules)) * 100
            print(f"  {combo}: {count} modules ({percentage:.1f}%)")
        
        return analysis
    
    def generate_classification_recommendations(self):
        """Generate recommendations based on analysis"""
        recommendations = []
        
        # Check if we found any successful module data
        successful_tests = [t for t in self.results["tests_performed"] if t["status"] == "success" and t.get("modules_found", 0) > 0]
        
        if not successful_tests:
            recommendations.append({
                "type": "authentication_required",
                "message": "Authentication is required to access module data. Need valid JWT tokens to test classification logic.",
                "action": "Obtain valid authentication credentials or test with authenticated requests"
            })
            return recommendations
        
        # Analyze the module data from successful tests
        for test in successful_tests:
            analysis = test.get("module_fields_analysis", {})
            
            # Check moduleType field reliability
            module_type_values = analysis.get("moduleType_values", {})
            if module_type_values:
                expected_values = ["personal", "assigned", "unassigned"]
                found_values = list(module_type_values.keys())
                
                if all(val in expected_values for val in found_values if val != "None"):
                    recommendations.append({
                        "type": "moduleType_reliable",
                        "message": f"moduleType field appears reliable with values: {found_values}",
                        "action": "Use moduleType as primary classification field"
                    })
                else:
                    recommendations.append({
                        "type": "moduleType_unexpected",
                        "message": f"moduleType has unexpected values: {found_values}. Expected: {expected_values}",
                        "action": "Investigate why moduleType values don't match specification"
                    })
            
            # Check autoAssignToNewUsers field
            auto_assign_values = analysis.get("autoAssignToNewUsers_values", {})
            if auto_assign_values:
                recommendations.append({
                    "type": "autoAssignToNewUsers_analysis",
                    "message": f"autoAssignToNewUsers values found: {list(auto_assign_values.keys())}",
                    "action": "Consider using autoAssignToNewUsers as secondary classification criteria"
                })
            
            # Check field combinations
            combinations = analysis.get("field_combinations", {})
            if combinations:
                recommendations.append({
                    "type": "field_combinations",
                    "message": f"Field combinations found: {list(combinations.keys())}",
                    "action": "Use combination of moduleType and autoAssignToNewUsers for accurate classification"
                })
        
        self.results["classification_recommendations"] = recommendations
        return recommendations
    
    async def run_all_tests(self):
        """Run all tests and generate report"""
        print("🚀 STARTING MODULE CLASSIFICATION DATA ANALYSIS")
        print("=" * 60)
        
        # Test backend accessibility first
        await self.test_backend_status()
        
        # Test direct web API call
        await self.test_direct_web_api_call()
        
        # Test backend proxy call
        await self.test_backend_proxy_call()
        
        # Generate recommendations
        self.generate_classification_recommendations()
        
        # Print summary
        self.print_summary()
        
        # Save results to file
        self.save_results()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📋 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.results["tests_performed"])
        successful_tests = len([t for t in self.results["tests_performed"] if t["status"] == "success"])
        auth_required_tests = len([t for t in self.results["tests_performed"] if t["status"] == "auth_required"])
        
        print(f"Total Tests: {total_tests}")
        print(f"Successful: {successful_tests}")
        print(f"Auth Required: {auth_required_tests}")
        print(f"Failed: {total_tests - successful_tests - auth_required_tests}")
        
        # Print key findings
        print(f"\n🔍 KEY FINDINGS:")
        
        modules_found = False
        for test in self.results["tests_performed"]:
            if test.get("modules_found", 0) > 0:
                modules_found = True
                print(f"✅ Found {test['modules_found']} modules in {test['test_name']}")
                
                analysis = test.get("module_fields_analysis", {})
                if analysis:
                    print(f"   - moduleType values: {list(analysis.get('moduleType_values', {}).keys())}")
                    print(f"   - autoAssignToNewUsers values: {list(analysis.get('autoAssignToNewUsers_values', {}).keys())}")
        
        if not modules_found:
            print("❌ No module data obtained - authentication required for all endpoints")
        
        # Print recommendations
        print(f"\n💡 RECOMMENDATIONS:")
        for i, rec in enumerate(self.results["classification_recommendations"], 1):
            print(f"{i}. {rec['message']}")
            print(f"   Action: {rec['action']}")
    
    def save_results(self):
        """Save results to JSON file"""
        filename = f"module_classification_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        try:
            with open(filename, 'w') as f:
                json.dump(self.results, f, indent=2, default=str)
            print(f"\n💾 Results saved to: {filename}")
        except Exception as e:
            print(f"\n❌ Failed to save results: {e}")

async def main():
    """Main test execution"""
    tester = ModuleClassificationTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())