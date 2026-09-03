# Bot + reyting API — bitta jarayon. Railway Dockerfile'ni o'zi topib quradi.
FROM python:3.12-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ma'lumotlar (reyting.db, users.json) shu papkada — Railway'da bu yerga volume ulanadi (DATA_DIR=/data)
VOLUME ["/data"]

CMD ["python", "bot.py"]
