.PHONY: setup env install start ios android web typecheck build-web clean reset rebuild help

help:
	@echo "Available commands:"
	@echo "  make setup      - First-time setup: install deps + create .env.local"
	@echo "  make install    - Install all dependencies"
	@echo "  make env        - Create .env.local from .env.example (if missing)"
	@echo "  make start      - Start Expo development server"
	@echo "  make ios        - Run on iOS simulator"
	@echo "  make android    - Run on Android emulator"
	@echo "  make web        - Run in web browser"
	@echo "  make typecheck  - Run the TypeScript type checker"
	@echo "  make build-web  - Export the production web build to dist/"
	@echo "  make clean      - Clean build artifacts and caches"
	@echo "  make reset      - Reset Metro bundler cache and restart"
	@echo "  make rebuild    - Full rebuild (clean + reinstall + clear cache)"
	@echo "  make help       - Show this help message"

setup: install env
	@echo ""
	@echo "✅ Setup complete. Next steps:"
	@echo "  1. Create a Supabase project at https://supabase.com"
	@echo "  2. In the Supabase SQL Editor, run supabase/schema.sql"
	@echo "  3. Paste your Project URL + anon key into .env.local"
	@echo "  4. Run 'make web' (or 'make ios' / 'make android')"

env:
	@if [ -f .env.local ]; then \
		echo ".env.local already exists — leaving it untouched."; \
	else \
		cp .env.example .env.local; \
		echo "Created .env.local from .env.example — fill in your Supabase URL + anon key."; \
	fi

install:
	@echo "Installing dependencies..."
	npm install

start:
	@echo "Starting Expo development server..."
	npm start

ios:
	@echo "Running on iOS simulator..."
	npm run ios

android:
	@echo "Running on Android emulator..."
	npm run android

web:
	@echo "Running in web browser..."
	npm run web

build-web:
	@echo "Exporting production web build to dist/..."
	npm run build:web

typecheck:
	@echo "Type-checking..."
	npm run typecheck

clean:
	@echo "Cleaning build artifacts and caches..."
	rm -rf node_modules
	rm -rf .expo
	rm -rf dist
	npm install

reset:
	@echo "Resetting Metro bundler cache..."
	npx expo start --clear

rebuild:
	@echo "Full rebuild: cleaning, reinstalling, and clearing cache..."
	rm -rf node_modules
	rm -rf .expo
	rm -rf dist
	npm install
	@echo "Rebuild complete! Run 'make start' to launch the app."
