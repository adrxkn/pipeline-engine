@echo off

mkdir backend\routers
mkdir backend\models
mkdir backend\services
mkdir backend\core
mkdir frontend\src\components
mkdir frontend\src\pages
mkdir worker

type nul > backend\__init__.py
type nul > backend\routers\__init__.py
type nul > backend\models\__init__.py
type nul > backend\services\__init__.py
type nul > backend\core\__init__.py
type nul > worker\__init__.py
type nul > backend\main.py
type nul > backend\core\config.py
type nul > backend\core\database.py
type nul > backend\models\run.py
type nul > backend\Dockerfile
type nul > docker-compose.yml
type nul > requirements.txt
type nul > .env
type nul > .gitignore
type nul > README.md

echo Done! Structure created.
pause