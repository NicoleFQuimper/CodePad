# CodePad Runner — Python 3.12 + Node 20 + data science stack
FROM python:3.12-slim

# Install Node.js 20
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Python data science packages
RUN pip install --no-cache-dir \
    numpy \
    pandas \
    scikit-learn \
    matplotlib \
    seaborn \
    scipy \
    statsmodels

WORKDIR /app
COPY package.json .
RUN npm install --production

COPY server.js .

# Run as non-root user for safety
RUN useradd -m appuser && chown -R appuser /app /tmp
USER appuser

EXPOSE 3000
CMD ["node", "server.js"]
