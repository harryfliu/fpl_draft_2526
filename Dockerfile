FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy dashboard files
COPY index.html .
COPY script.js .
COPY data_manager.js .
COPY serve_dashboard.py .

# Copy all gameweek data
COPY gw*/ ./

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Run the dashboard
CMD ["python", "serve_dashboard.py"]
