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

    std::string readBearerToken(const std::string& filename);
    UserCredentials getUserCredentials();
    
}
