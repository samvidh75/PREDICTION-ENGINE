FROM nvidia/cuda:12.1-runtime-ubuntu22.04

WORKDIR /app

RUN apt-get update && apt-get install -y python3.11 python3.11-venv python3.11-dev pip
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
RUN pip install sglang[all] torch torchvision torchaudio

RUN mkdir -p /models

EXPOSE 30000

CMD ["python3", "-m", "sglang.launch_server", \
     "--model-path", "meta-llama/Meta-Llama-3.1-8B-Instruct", \
     "--mem-fraction-static", "0.8", \
     "--port", "30000"]
