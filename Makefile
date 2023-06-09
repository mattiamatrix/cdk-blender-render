build:
	npx projen build

docker-build-cpu:
	cd resources/docker && \
	docker build . \
		-f cpu.Dockerfile \
		-t blender-cpu:latest \
		--platform=linux/amd64

# TODO fix for Mac M1
docker-test-cpu:
	docker run \
	-e AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID} \
	-e AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY} \
	-e AWS_SESSION_TOKEN=${AWS_SESSION_TOKEN} \
	-e AWS_DEFAULT_REGION=eu-west-2 \
	blender-cpu render -m CPU -i "s3://${TEST_BUCKET}/input/examples/blender_example.blend" -o "s3://test-cdk-blender-render-bucket/output" -f 1 -t 1

docker-build-gpu:
	cd resources/docker && \
	docker build . \
	-f gpu.Dockerfile \
	-t blender-gpu:latest \
	--platform=linux/amd64

docker-test-gpu:
	docker run \
	-e AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID} \
	-e AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY} \
	-e AWS_SESSION_TOKEN=${AWS_SESSION_TOKEN} \
	-e AWS_DEFAULT_REGION=eu-west-2 \
	blender-gpu:latest render -m CUDA -i "s3://${TEST_BUCKET}/input/examples/blender_example.blend" -o "s3://test-cdk-blender-render-bucket/output" -f 1 -t 1

blender-local-test:
	cd resources/blender && \
	blender -b blender_example.blend -o "frames"/ -f 1 -- --cycles-device "${RENDER_MODE}"

compile:
	npx projen compile

package:
	npx projen package:js

ship:
	@make compile
	@make package
