from fastapi import APIRouter, HTTPException, Depends
from models import PayMongoSourceRequest, PayMongoPaymentIntentRequest
import json
import base64
import urllib.request
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

PAYMONGO_SECRET_KEY = os.getenv("PAYMONGO_SECRET_KEY", "sk_test_kw8iRka1GRSvzamLKByrcoie")
PAYMONGO_PUBLIC_KEY = os.getenv("PAYMONGO_PUBLIC_KEY", "pk_test_qF59Ykv6EyHppyYW14PiBpMj")

def get_auth_header():
    auth_str = f"{PAYMONGO_SECRET_KEY}:"
    encoded_auth = base64.b64encode(auth_str.encode()).decode()
    return f"Basic {encoded_auth}"

@router.post("/paymongo/create-source")
def create_source(payload: PayMongoSourceRequest):
    url = "https://api.paymongo.com/v1/sources"
    
    # Payload for PayMongo
    data = {
        "data": {
            "attributes": {
                "amount": payload.amount,
                "type": payload.type,
                "currency": payload.currency,
                "redirect": {
                    "success": "http://localhost:5173/pos?payment=success",
                    "failed": "http://localhost:5173/pos?payment=failed"
                },
                "billing": {
                    "name": payload.customer_name or "Walk-in Customer",
                    "email": payload.customer_email or "walkin@example.com",
                    **({"phone": payload.customer_phone} if payload.customer_phone else {})
                }
            }
        }
    }
    
    print(f"PayMongo Request: {json.dumps(data, indent=2)}")
    print(f"Using API Key: {PAYMONGO_SECRET_KEY[:10]}...")
    
    req = urllib.request.Request(url, data=json.dumps(data).encode())
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", get_auth_header())
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            print(f"PayMongo Success: {json.dumps(res_data, indent=2)}")
            return res_data
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode()
        print(f"PayMongo HTTP Error {e.code}: {error_msg}")
        print(f"Response headers: {dict(e.headers)}")
        try:
            error_detail = json.loads(error_msg)
            raise HTTPException(status_code=e.code, detail=error_detail)
        except:
            raise HTTPException(status_code=e.code, detail=error_msg)
    except Exception as e:
        print(f"PayMongo Unexpected Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/paymongo/source/{source_id}")
def get_source(source_id: str):
    url = f"https://api.paymongo.com/v1/sources/{source_id}"
    
    req = urllib.request.Request(url)
    req.add_header("Authorization", get_auth_header())
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            return res_data
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode()
        raise HTTPException(status_code=e.code, detail=json.loads(error_msg))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/paymongo/create-payment-intent")
def create_payment_intent(payload: PayMongoPaymentIntentRequest):
    url = "https://api.paymongo.com/v1/payment_intents"
    
    data = {
        "data": {
            "attributes": {
                "amount": payload.amount,
                "payment_method_allowed": [payload.payment_method_allowed],
                "currency": payload.currency,
                "capture_type": "automatic",
                "payment_method_options": {
                    "paymaya": {
                        "billing": {
                            "name": payload.customer_name,
                            "phone": payload.customer_phone
                        }
                    }
                },
                "description": f"POS Sale - {payload.customer_name or 'Walk-in'}"
            }
        }
    }
    
    print(f"PayMongo PaymentIntent Request: {json.dumps(data, indent=2)}")
    print(f"Using API Key: {PAYMONGO_SECRET_KEY[:10]}...")
    
    req = urllib.request.Request(url, data=json.dumps(data).encode())
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", get_auth_header())
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            print(f"PayMongo PaymentIntent Success: {json.dumps(res_data, indent=2)}")
            return res_data
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode()
        print(f"PayMongo HTTP Error {e.code}: {error_msg}")
        print(f"Response headers: {dict(e.headers)}")
        try:
            error_detail = json.loads(error_msg)
            raise HTTPException(status_code=e.code, detail=error_detail)
        except:
            raise HTTPException(status_code=e.code, detail=error_msg)
    except Exception as e:
        print(f"PayMongo Unexpected Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/paymongo/payment-intent/{payment_intent_id}")
def get_payment_intent(payment_intent_id: str):
    url = f"https://api.paymongo.com/v1/payment_intents/{payment_intent_id}"
    
    req = urllib.request.Request(url)
    req.add_header("Authorization", get_auth_header())
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            return res_data
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode()
        raise HTTPException(status_code=e.code, detail=json.loads(error_msg))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
