docker build -t mqtt2artnet .
docker run -d --network host --name mqtt2artnet mqtt2artnet
