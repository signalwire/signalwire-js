#!/usr/bin/env python3
"""
Validate test_suite.json file format and content.
"""

import json
import sys
from pathlib import Path


def validate_test_suite(file_path: str) -> bool:
    """Validate the test suite JSON file."""

    try:
        with open(file_path, 'r') as f:
            test_suite = json.load(f)
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON format: {e}")
        return False
    except FileNotFoundError:
        print(f"ERROR: File not found: {file_path}")
        return False

    if not isinstance(test_suite, list):
        print("ERROR: test_suite.json must be a JSON array")
        return False

    if len(test_suite) == 0:
        print("ERROR: test_suite.json must contain at least one test")
        return False

    valid_categories = {"functional", "style"}
    errors = []
    warnings = []

    functional_count = 0
    style_count = 0
    long_tests_count = 0  # Tests with 10+ steps

    for i, test in enumerate(test_suite):
        test_id = f"Test {i + 1}"

        # Check required fields
        if "category" not in test:
            errors.append(f"{test_id}: Missing 'category' field")
        elif test["category"] not in valid_categories:
            errors.append(f"{test_id}: Invalid category '{test['category']}'. Must be 'functional' or 'style'")
        else:
            if test["category"] == "functional":
                functional_count += 1
            else:
                style_count += 1

        if "description" not in test:
            errors.append(f"{test_id}: Missing 'description' field")
        elif not isinstance(test["description"], str) or len(test["description"]) < 10:
            errors.append(f"{test_id}: Description must be a string with at least 10 characters")

        if "steps" not in test:
            errors.append(f"{test_id}: Missing 'steps' field")
        elif not isinstance(test["steps"], list):
            errors.append(f"{test_id}: 'steps' must be an array")
        elif len(test["steps"]) < 2:
            errors.append(f"{test_id}: Must have at least 2 steps")
        else:
            if len(test["steps"]) >= 10:
                long_tests_count += 1

            for j, step in enumerate(test["steps"]):
                if not isinstance(step, str):
                    errors.append(f"{test_id}, Step {j + 1}: Step must be a string")
                elif not step.startswith("Step "):
                    warnings.append(f"{test_id}, Step {j + 1}: Step should start with 'Step X:'")

        if "passes" not in test:
            errors.append(f"{test_id}: Missing 'passes' field")
        elif test["passes"] is not False:
            errors.append(f"{test_id}: 'passes' must be false for new tests")

    # Summary statistics
    total_tests = len(test_suite)
    print(f"\n=== Test Suite Validation Summary ===")
    print(f"Total tests: {total_tests}")
    print(f"Functional tests: {functional_count}")
    print(f"Style tests: {style_count}")
    print(f"Long tests (10+ steps): {long_tests_count}")

    # Check requirements
    if style_count == 0:
        warnings.append("Should have at least some 'style' category tests")

    long_test_percentage = (long_tests_count / total_tests * 100) if total_tests > 0 else 0
    if long_test_percentage < 5:
        warnings.append(f"Only {long_test_percentage:.1f}% of tests have 10+ steps (should be at least 5%)")
    else:
        print(f"Long tests percentage: {long_test_percentage:.1f}% (meets 5% requirement)")

    # Print errors and warnings
    if warnings:
        print(f"\n=== Warnings ({len(warnings)}) ===")
        for warning in warnings:
            print(f"  WARNING: {warning}")

    if errors:
        print(f"\n=== Errors ({len(errors)}) ===")
        for error in errors:
            print(f"  ERROR: {error}")
        print(f"\nValidation FAILED with {len(errors)} errors")
        return False

    print(f"\nValidation PASSED")
    return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python validate.py <test_suite.json>")
        sys.exit(1)

    file_path = sys.argv[1]

    # Handle relative paths
    if not Path(file_path).is_absolute():
        file_path = Path.cwd() / file_path

    success = validate_test_suite(str(file_path))
    sys.exit(0 if success else 1)
