#include "Utils.h"


namespace Utils {
     std::string Utils::readBearerToken(const std::string& filename) {
        std::ifstream file(filename);
        if (!file.is_open()) {
            std::cerr << "Failed to open bearer token file: " << filename << std::endl;
            return "";
        }
        std::string token;
        std::getline(file, token);
        return token;
    }

    UserCredentials Utils::getUserCredentials() {
        std::string username, password;
        std::cout << "Enter your username: ";
        std::cin >> username;
        std::cout << "Enter your password: ";
        std::cin >> password;
        return UserCredentials{ username, password };
    }
    std::string Utils::getEnv(const std::string& name) {
        #ifdef _WIN32
            char* buf = nullptr;
            size_t len = 0;
            if (_dupenv_s(&buf, &len, name.c_str()) != 0 || buf == nullptr)
                throw std::runtime_error("Missing environment variable: " + name);
            std::string value(buf);
            free(buf);
            return value;
        #else
            const char* v = std::getenv(name.c_str());
            if (!v) throw std::runtime_error("Missing environment variable: " + name);
            return v;
        #endif
    }
    inline void Utils::loadDotEnv(const std::string& path = ".env") {
        std::ifstream file(path);
        if (!file) return;  // no .env is fine (e.g. on Render)

        auto trim = [](std::string s) {
            const char* ws = " \t\r\n";
            s.erase(0, s.find_first_not_of(ws));
            s.erase(s.find_last_not_of(ws) + 1);
            return s;
        };

        std::string line;
        while (std::getline(file, line)) {
            line = trim(line);
            if (line.empty() || line[0] == '#') continue;

            auto eq = line.find('=');
            if (eq == std::string::npos) continue;

            std::string key = trim(line.substr(0, eq));
            std::string value = trim(line.substr(eq + 1));

            // strip optional surrounding quotes
            if (value.size() >= 2 &&
                ((value.front() == '"' && value.back() == '"') ||
                (value.front() == '\'' && value.back() == '\'')))
                value = value.substr(1, value.size() - 2);

            // don't override variables that are already set (Render's win)
    #ifdef _WIN32
            if (std::getenv(key.c_str())) continue;
            _putenv_s(key.c_str(), value.c_str());
    #else
            setenv(key.c_str(), value.c_str(), 0);  // 0 = don't overwrite
    #endif
        }
    }

}

    
