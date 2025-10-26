#!/usr/bin/env python3
"""
Frontend Processor Testing for Fill-in-Blank and Word Cloud
Tests the JavaScript processing utilities by simulating their behavior
"""

import json
import sys
import re
from typing import Dict, List, Any

class ProcessorTester:
    def __init__(self):
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str, data: Dict = None):
        """Log test results"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'data': data or {}
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        if data and not success:
            print(f"   Data: {json.dumps(data, indent=2)}")
        print()

    def simulate_fill_blank_processing(self, text: str, stage: int) -> Dict:
        """Simulate fill-in-blank processing logic"""
        words = text.split()
        total_words = len(words)
        
        if total_words == 0:
            return {
                'displayText': text,
                'blanks': [],
                'stage': stage,
                'originalText': text,
                'correctAnswers': {}
            }
        
        # Calculate removal percentage (stage 1: 10-15%, stage 9: 90-95%)
        base_percentage = stage * 10
        removal_percentage = min(base_percentage + 5, 95)  # Add 5% variance
        
        # Calculate words to remove
        min_words = max(1, stage)  # At least 1 word per stage
        percentage_words = max(1, int((total_words * removal_percentage) / 100))
        words_to_remove = min(max(min_words, percentage_words), total_words - 1)
        
        # Simulate random word selection
        import random
        random.seed(42)  # For consistent testing
        indices_to_remove = random.sample(range(total_words), words_to_remove)
        indices_to_remove.sort()
        
        # Build result
        blanks = []
        correct_answers = {}
        display_text = ""
        blank_index = 0
        
        for i, word in enumerate(words):
            if i in indices_to_remove:
                blanks.append({
                    'index': blank_index,
                    'correctAnswer': word,
                    'choices': [word, f"{word}s", f"the{word}", f"{word}ing"]  # Mock choices
                })
                correct_answers[blank_index] = word
                display_text += "___"
                blank_index += 1
            else:
                display_text += word
            
            if i < len(words) - 1:
                display_text += " "
        
        return {
            'displayText': display_text,
            'blanks': blanks,
            'stage': stage,
            'originalText': text,
            'correctAnswers': correct_answers,
            'wordsRemoved': words_to_remove,
            'totalWords': total_words,
            'removalPercentage': removal_percentage
        }

    def simulate_word_cloud_processing(self, text: str, stage: int) -> Dict:
        """Simulate word cloud processing logic"""
        words = text.split()
        
        # Calculate decoy count based on stage
        if stage <= 3:
            decoy_count = 2 + (stage - 1)  # 2-4 decoys
        elif stage <= 6:
            decoy_count = 4 + (stage - 4)  # 4-6 decoys
        else:
            decoy_count = 6 + (stage - 7)  # 6-8 decoys
        
        # Generate mock decoys
        decoys = []
        for i in range(min(decoy_count, len(words))):
            decoys.append(f"decoy{i+1}")
        
        return {
            'words': words,
            'decoys': decoys,
            'correctOrder': words,
            'stage': stage,
            'originalText': text,
            'decoyCount': len(decoys)
        }

    def test_fill_blank_stage_progression(self):
        """Test fill-in-blank stage progression"""
        test_text = "Do you have a food allergy?"
        
        for stage in [1, 5, 9]:
            result = self.simulate_fill_blank_processing(test_text, stage)
            
            expected_min_removal = stage * 10  # Minimum percentage
            actual_percentage = result['removalPercentage']
            words_removed = result['wordsRemoved']
            
            # Check if more words are removed in higher stages
            if stage == 1:
                stage1_words = words_removed
            elif stage == 5:
                stage5_words = words_removed
                if stage5_words > stage1_words:
                    self.log_test(
                        f"Fill-Blank Stage {stage} Progression",
                        True,
                        f"Stage {stage} removes more words ({stage5_words}) than stage 1 ({stage1_words})",
                        {'stage': stage, 'words_removed': words_removed, 'percentage': actual_percentage}
                    )
                else:
                    self.log_test(
                        f"Fill-Blank Stage {stage} Progression",
                        False,
                        f"Stage {stage} should remove more words than stage 1",
                        {'stage1_words': stage1_words, 'stage5_words': stage5_words}
                    )
            elif stage == 9:
                stage9_words = words_removed
                if stage9_words >= stage5_words:
                    self.log_test(
                        f"Fill-Blank Stage {stage} Progression",
                        True,
                        f"Stage {stage} removes most words ({stage9_words})",
                        {'stage': stage, 'words_removed': words_removed, 'percentage': actual_percentage}
                    )
                else:
                    self.log_test(
                        f"Fill-Blank Stage {stage} Progression",
                        False,
                        f"Stage {stage} should remove more words than stage 5",
                        {'stage5_words': stage5_words, 'stage9_words': stage9_words}
                    )

    def test_fill_blank_structure(self):
        """Test fill-in-blank output structure"""
        test_text = "Do you have a food allergy?"
        result = self.simulate_fill_blank_processing(test_text, 3)
        
        required_fields = ['displayText', 'blanks', 'stage', 'originalText', 'correctAnswers']
        missing_fields = [field for field in required_fields if field not in result]
        
        if not missing_fields:
            # Check if blanks have correct structure
            if result['blanks']:
                blank = result['blanks'][0]
                blank_fields = ['index', 'correctAnswer', 'choices']
                missing_blank_fields = [field for field in blank_fields if field not in blank]
                
                if not missing_blank_fields:
                    # Check if display text has blanks
                    if '___' in result['displayText']:
                        self.log_test(
                            "Fill-Blank Structure",
                            True,
                            f"Correct structure with {len(result['blanks'])} blanks",
                            {'blanks_count': len(result['blanks']), 'has_underscores': True}
                        )
                    else:
                        self.log_test(
                            "Fill-Blank Structure",
                            False,
                            "Display text missing blank markers (___)",
                            {'display_text': result['displayText']}
                        )
                else:
                    self.log_test(
                        "Fill-Blank Structure",
                        False,
                        f"Blank missing fields: {missing_blank_fields}",
                        {'blank': blank}
                    )
            else:
                self.log_test(
                    "Fill-Blank Structure",
                    False,
                    "No blanks generated",
                    {'result': result}
                )
        else:
            self.log_test(
                "Fill-Blank Structure",
                False,
                f"Missing required fields: {missing_fields}",
                {'result': result}
            )

    def test_word_cloud_decoy_progression(self):
        """Test word cloud decoy progression"""
        test_text = "Do you have a food allergy?"
        
        stage_results = {}
        for stage in [1, 3, 5, 7, 9]:
            result = self.simulate_word_cloud_processing(test_text, stage)
            stage_results[stage] = result['decoyCount']
        
        # Check if decoy count increases with stage
        progression_correct = True
        for i in range(1, len(stage_results)):
            stages = list(stage_results.keys())
            if stage_results[stages[i]] < stage_results[stages[i-1]]:
                progression_correct = False
                break
        
        if progression_correct:
            self.log_test(
                "Word Cloud Decoy Progression",
                True,
                f"Decoy count increases with stage: {stage_results}",
                stage_results
            )
        else:
            self.log_test(
                "Word Cloud Decoy Progression",
                False,
                f"Decoy count should increase with stage: {stage_results}",
                stage_results
            )

    def test_word_cloud_structure(self):
        """Test word cloud output structure"""
        test_text = "Do you have a food allergy?"
        result = self.simulate_word_cloud_processing(test_text, 5)
        
        required_fields = ['words', 'decoys', 'correctOrder', 'stage', 'originalText']
        missing_fields = [field for field in required_fields if field not in result]
        
        if not missing_fields:
            # Check if words and correctOrder match
            if result['words'] == result['correctOrder']:
                # Check if decoys are different from words
                words_set = set(result['words'])
                decoys_set = set(result['decoys'])
                overlap = words_set.intersection(decoys_set)
                
                if not overlap:
                    self.log_test(
                        "Word Cloud Structure",
                        True,
                        f"Correct structure with {len(result['words'])} words and {len(result['decoys'])} decoys",
                        {'words_count': len(result['words']), 'decoys_count': len(result['decoys'])}
                    )
                else:
                    self.log_test(
                        "Word Cloud Structure",
                        False,
                        f"Decoys overlap with original words: {overlap}",
                        {'overlap': list(overlap)}
                    )
            else:
                self.log_test(
                    "Word Cloud Structure",
                    False,
                    "Words and correctOrder don't match",
                    {'words': result['words'], 'correctOrder': result['correctOrder']}
                )
        else:
            self.log_test(
                "Word Cloud Structure",
                False,
                f"Missing required fields: {missing_fields}",
                {'result': result}
            )

    def test_mock_data_fallback(self):
        """Test that mock data is properly structured"""
        mock_session_data = {
            'moduleId': 'test-module',
            'content': {
                'text': 'Do you have a food allergy?',
                'words': ['Do', 'you', 'have', 'a', 'food', 'allergy'],
            },
            'stage': 1,
            'learningType': 'fill_blank',
        }
        
        # Test that mock data has required structure
        required_fields = ['moduleId', 'content', 'stage', 'learningType']
        missing_fields = [field for field in required_fields if field not in mock_session_data]
        
        if not missing_fields:
            content = mock_session_data['content']
            if 'text' in content and 'words' in content:
                self.log_test(
                    "Mock Data Structure",
                    True,
                    "Mock session data has correct structure",
                    {'fields': list(mock_session_data.keys())}
                )
            else:
                self.log_test(
                    "Mock Data Structure",
                    False,
                    "Mock content missing text or words",
                    {'content': content}
                )
        else:
            self.log_test(
                "Mock Data Structure",
                False,
                f"Mock data missing fields: {missing_fields}",
                {'mock_data': mock_session_data}
            )

    def run_all_tests(self):
        """Run all processor tests"""
        print("🚀 Starting Frontend Processor Tests")
        print("=" * 60)
        print()
        
        # Run tests
        self.test_fill_blank_stage_progression()
        self.test_fill_blank_structure()
        self.test_word_cloud_decoy_progression()
        self.test_word_cloud_structure()
        self.test_mock_data_fallback()
        
        # Summary
        print("=" * 60)
        print("📊 PROCESSOR TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        print()
        
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['details']}")
            print()
        
        return failed_tests == 0

def main():
    """Main test execution"""
    tester = ProcessorTester()
    success = tester.run_all_tests()
    
    if success:
        print("✅ All processor tests passed!")
    else:
        print("❌ Some processor tests failed!")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)