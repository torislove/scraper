FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir fastembed numpy
COPY services/relevance/relevance_server.py ./
ENV FASTEMBED_MODEL=BAAI/bge-small-en-v1.5
EXPOSE 5004
CMD ["python3", "-u", "relevance_server.py", "5004"]
