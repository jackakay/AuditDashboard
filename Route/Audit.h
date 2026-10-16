#pragma once

#include <string>
#include <utility>
#include "json.hpp"

struct Audit {
    std::string site_name;
    std::string site_post_code;
    std::string client_name;
    std::string internal_id;
    std::string deadline_date;
    double auditor_pay_per_audit = 0.0;
    //double pay_inc_hol = 0.0;
    std::pair<double, double> coords = {0.0, 0.0}; // Stores {lng, lat}
};

// Custom parser function that runs automatically during nlohmann::json::parse()
inline void from_json(const nlohmann::json& j, Audit& audit) {
    j.at("site_name").get_to(audit.site_name);
    j.at("site_post_code").get_to(audit.site_post_code);
    j.at("client_name").get_to(audit.client_name);
    j.at("internal_id").get_to(audit.internal_id);
    j.at("deadline_date").get_to(audit.deadline_date);
    j.at("auditor_pay_per_audit").get_to(audit.auditor_pay_per_audit);
    //j.at("pay_inc_hol").get_to(audit.pay_inc_hol);

    // Automatically parse and map "site_coordinates" to your coords pair
    if (j.contains("site_coordinates") && !j["site_coordinates"].is_null()) {
        const auto& sc = j["site_coordinates"];
        double lng = sc.value("lng", 0.0);
        double lat = sc.value("lat", 0.0);
        audit.coords = {lng, lat};
    }
}