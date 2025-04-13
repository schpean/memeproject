#!/bin/bash

echo "💣 Curățare light Docker..."
docker-compose -f docker-compose.dev.yml down -v

docker image prune -f
docker volume prune -f

echo "📥 Trag manual imaginea postgres..."
docker pull postgres:15-alpine

echo "🔧 Build containere (cu cache)..."
docker-compose -f docker-compose.dev.yml build

echo "🚀 Pornire containere..."
docker-compose -f docker-compose.dev.yml up -d

echo "⏳ Așteptare pornire DB..."
sleep 10

read -p "Te-ai logat pe website? (yes/no): " user_logged_in

if [[ "$user_logged_in" =~ ^(y|yes)$ ]]; then
    echo "🛡️ Setare rol admin pentru mateas.bogdan@gmail.com..."
    docker-compose -f docker-compose.dev.yml exec postgres \
        psql -U ubuntu -d meme_db -c \
        "UPDATE users SET role_id = 3 WHERE email = 'mateas.bogdan@gmail.com';"
else
    echo "⚠️ Rulează manual după login:"
    echo 'docker-compose -f docker-compose.dev.yml exec postgres psql -U ubuntu -d meme_db -c "UPDATE users SET role_id = 3 WHERE email = '\''mateas.bogdan@gmail.com'\'';"'
fi

echo "✅ Totul e gata. http://localhost:1337"
