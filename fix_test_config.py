import re

with open('tests/config/test_config.py', 'r') as f:
    text = f.read()

# For lines like s.resolve_models("claude-opus-4-20250514") == "open_router/deepseek/deepseek-r1"
# Which might be spanning multiple lines.
text = re.sub(r's\.resolve_models\(([^)]+)\)\s*==', r's.resolve_models(\1)[0] ==', text)

with open('tests/config/test_config.py', 'w') as f:
    f.write(text)

with open('tests/api/test_model_router.py', 'r') as f:
    text = f.read()

text = text.replace('.resolve(', '.resolve_all(')
text = text.replace('ModelRouter(settings).resolve_all(', 'ModelRouter(settings).resolve_all(') # Just in case

with open('tests/api/test_model_router.py', 'w') as f:
    f.write(text)
