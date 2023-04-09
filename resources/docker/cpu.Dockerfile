FROM --platform=linux/amd64 public.ecr.aws/docker/library/ubuntu:22.04

# Install dependencies
RUN apt-get update && \
    apt-get install -y \
    sudo \
    curl \
    ca-certificates \
    zip \
    xz-utils \
    libx11-dev \
    libxi-dev \
    libxxf86vm-dev \
    libfontconfig1 \
    libxrender1 \
    libgl1-mesa-glx

# Download and install AWS CLI
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    sudo ./aws/install && \
    rm ./aws/install

# Download and install Blender
RUN curl "https://mirror.clarkson.edu/blender/release/Blender3.5/blender-3.5.0-linux-x64.tar.xz" -o "blender.tar.xz" && \
    tar -xvf blender.tar.xz --strip-components=1 -C /bin && \
    rm -rf blender.tar.xz && \
    rm -rf blender

# Copy FFmpeg to the root of the container and unzip it
RUN curl "https://johnvansickle.com/ffmpeg/builds/ffmpeg-git-amd64-static.tar.xz" -o "ffmpeg.tar.xz" && \
    tar -xvf ffmpeg.tar.xz --strip-components=1 -C /bin && \
    rm -rf ffmpeg.tar.xz && \
    rm -rf ffmpeg

# Copy the script to the root of the container and give it permission to be executed
COPY ./render.sh /
RUN chmod +x /render.sh

ENTRYPOINT ["/render.sh"]
