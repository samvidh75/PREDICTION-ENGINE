#!/bin/bash
# Pre-deployment validation

echo "Running pre-deployment checks..."

npx tsc --noEmit || exit 1
echo "TypeScript check passed"

npm run build || exit 1
echo "Build passed"

if [ -f "pytest.ini" ]; then
  pytest backend/tests/engines/ -v || exit 1
  echo "Backend tests passed"
fi

npx eslint src/ --ext .ts,.tsx && echo "Lint passed"

echo ""
echo "All checks passed!"
echo ""
echo "Next steps:"
echo "1. vercel --prod (frontend)"
echo "2. railway up (backend)"
echo "3. Wait for green status"
echo "4. Manual smoke test (check /scanner, /stock?id=TCS)"
echo "5. Verify mobile (375px viewport)"
