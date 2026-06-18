import os
import re

for file_path in ["tests/config/test_config.py", "tests/api/test_model_router.py"]:
    with open(file_path, "r") as f:
        content = f.read()

    # Replace .resolve_model(...) == "..." with .resolve_models(...)[0] == "..."
    # First change resolve_model to resolve_models
    content = content.replace("resolve_model(", "resolve_models(")
    
    # Then change s.resolve_models(...) == "foo" to s.resolve_models(...)[0] == "foo"
    # Or just replace the exact test patterns
    content = re.sub(r'(s\.resolve_models\([^)]+\)) ==', r'\1[0] ==', content)
    
    with open(file_path, "w") as f:
        f.write(content)

print("Fixed tests")
