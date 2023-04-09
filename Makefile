build:
	npx projen build

docker-cpu:
	cd resources/docker && \
	docker build . -f cpu.Dockerfile -t blender-cpu:latest

docker-gpu:
	cd resources/docker && \
	docker build . -f gpu.Dockerfile -t blender-gpu:latest

compile:
	npx projen compile

package:
	npx projen package:js

ship:
	@make compile
	@make package