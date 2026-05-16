# --- Stage 1: Build the C++ application using CMake ---
FROM alpine:latest AS builder

# Install build essentials: g++, make, and cmake
RUN apk add --no-cache g++ make cmake

WORKDIR /app

# Copy all your source files, headers, and your CMakeLists.txt
COPY . .

# Create a build directory, configure the project, and compile it
RUN mkdir build && \
    cd build && \
    cmake -DCMAKE_BUILD_TYPE=Release .. && \
    make

# --- Stage 2: Create the minimal runner container ---
FROM alpine:latest

# Install runtime dependencies for C++ binaries on Alpine
RUN apk add --no-cache libstdc++

WORKDIR /root/

# Copy the compiled binary from Stage 1
# NOTE: Replace 'YOUR_EXECUTABLE_NAME' with the target name 
# defined in your CMakeLists.txt (inside your add_executable() command)
COPY --from=builder /app/build/WebServer ./server

# Expose the default container port
EXPOSE 8080

# Run the server
CMD ["./server"]