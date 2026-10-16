cmake_minimum_required(VERSION 3.10)

project(WebServer)

set(CMAKE_CXX_STANDARD 17)
# Copy the public folder to the build directory
file(COPY ${CMAKE_CURRENT_SOURCE_DIR}/static DESTINATION ${CMAKE_CURRENT_BINARY_DIR})
file(COPY ${CMAKE_CURRENT_SOURCE_DIR}/Auth.py DESTINATION ${CMAKE_CURRENT_BINARY_DIR})

add_executable(WebServer
    main.cpp
    ApiClient.cpp
    ApiClient.h
    Dashboard.cpp
    Dashboard.h
    json.hpp
    httplib.h
    Utils.cpp
    Utils.h
    DistanceMatrix.h
    HeldKarp.cpp
    HeldKarp.h
    Audit.h

)