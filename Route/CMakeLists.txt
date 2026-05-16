cmake_minimum_required(VERSION 3.10)

project(WebServer)

set(CMAKE_CXX_STANDARD 17)

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
)