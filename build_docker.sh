#!/bin/bash
docker image build -t mqtt2artnet .
# docker save mqtt2artnet |gzip> ./docker/mqtt2artnet.tar.gz
# import: docker load <./docker/mqtt2artnet.tar.gz