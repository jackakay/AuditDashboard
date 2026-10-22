#pragma once
#include <string>
#include <iostream>
#include <fstream>
#include <vector>
#include "httplib.h"

namespace Utils {

    struct UserCredentials {
        std::string username;
        std::string password;
    };
    class Utils {
        public:
            static std::string readBearerToken(const std::string& filename);
            static UserCredentials getUserCredentials();
            static std::string getEnv(const std::string& name);
            static void loadDotEnv(const std::string& path = ".env");
    };
    
}
