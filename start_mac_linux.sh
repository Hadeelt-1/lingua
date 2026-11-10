#!/bin/bash
echo "============================================"
echo "  Lingua 语伴 - starting backend server"
echo "============================================"

cd "$(dirname "$0")/backend"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt --quiet

echo ""
echo "Starting server... open http://127.0.0.1:5050 in your browser"
echo ""

python app.py
