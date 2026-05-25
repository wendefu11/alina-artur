FROM python:3.12-slim
WORKDIR /app
COPY alina.py /app/alina.py
COPY static /app/static
RUN mkdir -p /app/data
EXPOSE 8000
CMD ["python", "alina.py"]
