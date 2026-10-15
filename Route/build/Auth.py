import sys
import json
from pycognito import Cognito

USERNAME = sys.argv[1]
PASSWORD = sys.argv[2]

USER_POOL_ID = "eu-west-2_uaoadloGf"  # You need to find this
CLIENT_ID    = "4gq3t22ps2qls2ipuqn5eja44g"  # Already visible in your curl

try:
    u = Cognito(USER_POOL_ID, CLIENT_ID, username=USERNAME)
    u.authenticate(password=PASSWORD)

    print(json.dumps({
        "access_token":  u.access_token,
        "id_token":      u.id_token,
        "refresh_token": u.refresh_token
    }))
except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)