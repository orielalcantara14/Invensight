from fastapi import APIRouter, HTTPException, Depends
from models import PayMongoSourceRequest, PayMongoPaymentIntentRequest, PayMongoCheckoutSessionRequest
import json
import base64
import urllib.request
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

PAYMONGO_SECRET_KEY = os.getenv("PAYMONGO_SECRET_KEY")
PAYMONGO_PUBLIC_KEY = os.getenv("PAYMONGO_PUBLIC_KEY")

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
                    "success": payload.success_url,
                    "failed": payload.cancel_url
                },
                "billing": {
                    "name": payload.customer_name or "Walk In customer",
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

@router.get("/paymongo/status/{source_id}")
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
                "description": f"POS Sale - {payload.customer_name or 'Walk In customer'}"
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

@router.post("/paymongo/checkout")
def create_checkout_session(payload: PayMongoCheckoutSessionRequest):
    url = "https://api.paymongo.com/v1/checkout_sessions"
    
    # Sanitize and prepare line items
    line_items = []
    if payload.items:
        for item in payload.items:
            line_items.append({
                "currency": item.get("currency", "PHP"),
                "amount": item.get("amount"),
                "description": item.get("description", "Product Item"),
                "name": item.get("name", "Product"),
                "quantity": item.get("quantity", 1)
            })
    else:
        # Default single line item if none provided
        line_items.append({
            "currency": payload.currency,
            "amount": payload.amount,
            "description": payload.description,
            "name": "POS Sale",
            "quantity": 1
        })
    
    data = {
        "data": {
            "attributes": {
                "send_email_receipt": False,
                "show_description": True,
                "show_line_items": True,
                "line_items": line_items,
                "payment_method_types": ["gcash", "paymaya"],
                "description": payload.description,
                "success_url": payload.success_url,
                "cancel_url": payload.cancel_url,
                "billing": {
                    "name": payload.customer_name or "Walk In customer",
                    "phone": payload.customer_phone,
                    "email": payload.customer_email
                }
            }
        }
    }
    
    print(f"PayMongo CheckoutSession Request: {json.dumps(data, indent=2)}")
    req = urllib.request.Request(url, data=json.dumps(data).encode())
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", get_auth_header())
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            print(f"PayMongo CheckoutSession Success: {json.dumps(res_data, indent=2)}")
            return res_data
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode()
        print(f"PayMongo HTTP Error {e.code}: {error_msg}")
        try:
            error_detail = json.loads(error_msg)
            raise HTTPException(status_code=e.code, detail=error_detail)
        except:
            raise HTTPException(status_code=e.code, detail=error_msg)
    except Exception as e:
        print(f"PayMongo Unexpected Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/paymongo/checkout-session/{session_id}")
def get_checkout_session(session_id: str):
    url = f"https://api.paymongo.com/v1/checkout_sessions/{session_id}"
    
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
