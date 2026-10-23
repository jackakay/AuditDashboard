cmake_minimum_required(VERSION 3.10)

project(WebServer)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
# Copy the public folder to the build directory
file(COPY ${CMAKE_CURRENT_SOURCE_DIR}/static DESTINATION ${CMAKE_CURRENT_BINARY_DIR})
file(COPY ${CMAKE_CURRENT_SOURCE_DIR}/Auth.py DESTINATION ${CMAKE_CURRENT_BINARY_DIR})

add_executable(WebServer
    main.cpp
    ApiClient.cpp
    ApiClient.h
    Dashboard.cpp
    Dashboard.h
    utils/json.hpp
    utils/httplib.h
    Utils.cpp
    Utils.h
    DistanceMatrix.h 
    route_methods/BruteForce.cpp
    route_methods/BruteForce.h
    route_methods/HeldKarp.cpp
    route_methods/HeldKarp.h
    route_methods/NearestNeighbour.cpp
    route_methods/NearestNeighbour.h
    Audit.h

)