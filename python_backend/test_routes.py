"""
Quick route testing script
Run this with: python test_routes.py
"""

from app import app

print("\n=== Registered Routes ===\n")

routes = []
for rule in app.url_map.iter_rules():
    routes.append({
        'endpoint': rule.endpoint,
        'methods': ','.join(rule.methods - {'HEAD', 'OPTIONS'}),
        'path': str(rule)
    })

# Sort by path
routes.sort(key=lambda x: x['path'])

for route in routes:
    print(f"{route['methods']:20} {route['path']:40} -> {route['endpoint']}")

print(f"\n=== Total Routes: {len(routes)} ===\n")
