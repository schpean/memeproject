#!/bin/bash

# Oprește și elimină toate containerele, volumele, rețelele și imaginile
echo "Oprire și curățare Docker..."
docker-compose down -v
docker rm -f $(docker ps -aq) || true
docker rmi -f $(docker images -q) || true
docker volume rm $(docker volume ls -q) || true
docker system prune -a -f --volumes

# Construiește imaginile fără a folosi cache-ul
echo "Construire containere noi..."
docker-compose -f docker-compose.dev.yml build --no-cache

# Pornește containerele
echo "Pornire containere..."
docker-compose -f docker-compose.dev.yml up -d

# Așteaptă puțin până pornește complet baza de date
echo "Așteptare pornire completă a bazei de date..."
sleep 10

# Întreabă utilizatorul dacă s-a logat pe website
read -p "Te-ai logat pe website? (yes/no): " user_logged_in

if [ "$user_logged_in" = "y" ]; then
    # Setează rolul de admin pentru utilizatorul specificat
    echo "Setare rol admin pentru utilizatorul mateas.bogdan@gmail.com..."
    docker-compose -f docker-compose.dev.yml exec postgres psql -U ubuntu -d meme_db -c "UPDATE users SET role_id = 3 WHERE email = 'mateas.bogdan@gmail.com';"
else
    echo "Trebuie să te loghezi pe website înainte de a seta rolul de admin."
    echo "Poți rula comanda manual după ce te loghezi:"
    echo "docker-compose -f docker-compose.dev.yml exec postgres psql -U ubuntu -d meme_db -c \"UPDATE users SET role_id = 3 WHERE email = 'mateas.bogdan@gmail.com';\""
fi

echo "Procesul a fost finalizat! Aplicația rulează pe http://localhost:1337" 