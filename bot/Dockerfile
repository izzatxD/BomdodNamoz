# Bot + reyting API — bitta jarayon. Railway Dockerfile'ni o'zi topib quradi.
FROM python:3.12-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ma'lumotlar (reyting.db, users.json) shu papkada — Railway'da /data uchun Railway Volume ulanadi (DATA_DIR=/data)
# Eslatma: doimiy saqlash uchun Railway dashboard'da service Settings > Volumes bo'limidan
# /data manziliga volume biriktiring — Dockerfile VOLUME instruksiyasi Railway'da qo'llab-quvvatlanmaydi.

CMD ["python", "bot.py"]
