"""
Reset password for a user in MongoDB Atlas.
Usage: python reset_password.py <email> <new_password>
"""
import sys
import os
import asyncio

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.models.user import User, normalize_email
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie


async def reset_password(email: str, new_password: str):
    email = normalize_email(email)
    
    print(f"Connecting to MongoDB Atlas...")
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.mongodb_db]
    
    await init_beanie(database=db, document_models=[User])
    
    user = await User.find_one({"email": email})
    if not user:
        print(f"User '{email}' NOT found in Atlas database '{settings.mongodb_db}'.")
        print(f"Available users:")
        all_users = await db.users.find({}).limit(10).to_list(10)
        for u in all_users:
            print(f"  - {u.get('email')} (tenant: {u.get('tenant_id')})")
        client.close()
        return False
    
    print(f"User '{email}' found (tenant: {user.tenant_id})")
    print(f"Old hash: {user.password_hash[:60]}...")
    
    # Set new password
    new_hash = hash_password(new_password)
    user.password_hash = new_hash
    await user.save()
    
    # Verify
    verify_result = verify_password(new_password, user.password_hash)
    print(f"New password set: {new_password}")
    print(f"New hash: {user.password_hash[:60]}...")
    print(f"Verification test: {'PASSED' if verify_result else 'FAILED'}")
    
    client.close()
    return True


if __name__ == "__main__":
    if len(sys.argv) >= 3:
        email = sys.argv[1]
        password = sys.argv[2]
    else:
        email = "pavanikanteti55@gmail.com"
        password = "pavanikanteti55"
    
    if len(password) < 6:
        print("Password must be at least 6 characters.")
        sys.exit(1)
    
    success = asyncio.run(reset_password(email, password))
    if success:
        print(f"\n✓ Password reset complete!")
        print(f"  Email   : {email}")
        print(f"  Password: {password}")
    else:
        print(f"\n✗ Password reset failed.")
        sys.exit(1)

