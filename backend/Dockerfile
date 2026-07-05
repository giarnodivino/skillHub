FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Create necessary directories for static and media files
RUN mkdir -p static media
RUN chmod +x start.sh

# Expose port
EXPOSE 8000

# Default command (can be overridden in docker-compose.yml)
CMD ["./start.sh"]
