"""
Diagnostic script to check user existence in MongoDB Atlas.
Run: python check_user.py
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.config import settings
from app.models.user import User, normalize_email
from app.core.security import hash_password
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import asyncio


async def check_user(email_to_check: str):
    print(f"\n{'='*60}")
    print(f"CONFIGURATION")
    print(f"{'='*60}")
    print(f"MongoDB URI: {settings.mongodb_uri[:55]}...")
    print(f"MongoDB DB : {settings.mongodb_db}")
    print(f"Skip DB    : {settings.skip_db}")

    print(f"\n{'='*60}")
    print(f"CONNECTING TO MONGODB ATLAS")
    print(f"{'='*60}")
    
    client = AsyncIOMotorClient(settings.mongodb_uri)
    try:
        await client.admin.command({"ping": 1})
        print("✓ MongoDB connection successful")
    except Exception as e:
        print(f"✗ MongoDB connection FAILED: {e}")
        client.close()
        return

    db = client[settings.mongodb_db]

    # List all collections
    collections = await db.list_collection_names()
    print(f"\nCollections in '{settings.mongodb_db}': {collections}")

    await init_beanie(
        database=db,
        document_models=[
            User,
        ],
    )
    
    email = normalize_email(email_to_check)
    print(f"\n{'='*60}")
    print(f"SEARCHING FOR USER: {email}")
    print(f"{'='*60}")

    # Method 1: Direct Beanie find
    user = await User.find_one({"email": email})
    if user:
        print(f"✓ User FOUND via Beanie!")
        print(f"  Email     : {user.email}")
        print(f"  Tenant ID : {user.tenant_id}")
        print(f"  Role      : {user.role}")
        print(f"  Created   : {user.created_at}")
    else:
        print(f"✗ User NOT found via Beanie")

    # Method 2: Raw MongoDB query (case insensitive)
    raw_user = await db.users.find_one({"email": {"$regex": f"^{email}$", "$options": "i"}})
    if raw_user:
        print(f"✓ User FOUND via raw MongoDB query!")
        print(f"  Email     : {raw_user.get('email')}")
        print(f"  Tenant ID : {raw_user.get('tenant_id')}")
        print(f"  Role      : {raw_user.get('role')}")
    else:
        print(f"✗ User NOT found via raw MongoDB query either")

    # Method 3: Check all users in the collection
    all_users_cursor = db.users.find({}).limit(10)
    all_users = await all_users_cursor.to_list(length=10)
    print(f"\nTotal users in collection: {len(all_users)}")
    if all_users:
        print("Users in database:")
        for u in all_users:
            print(f"  - {u.get('email')} (tenant: {u.get('tenant_id')}, role: {u.get('role')})")
    else:
        print("No users found in the users collection!")

        # Ask if user wants to create one
        print(f"\n{'='*60}")
        print(f"CREATE USER: {email}")
        print(f"{'='*60}")
        create = input(f"Create user '{email}' now? (y/n): ")
        if create.lower() == 'y':
            tenant_id = input("Enter tenant_id (default: default_tenant): ").strip() or "default_tenant"
            password = input("Enter password (min 6 chars): ").strip()
            while len(password) < 6:
                password = input("Password must be at least 6 characters. Try again: ").strip()

            new_user = User(
                email=email,
                password_hash=hash_password(password),
                tenant_id=tenant_id,
                role="user",
            )
            await new_user.insert()
            print(f"✓ User '{email}' CREATED successfully!")
            print(f"  Tenant ID: {tenant_id}")
            print(f"  Password : {password}")
        else:
            print("Skipping user creation.")

    client.close()


if __name__ == "__main__":
    email_to_check = sys.argv[1] if len(sys.argv) > 1 else "pavanikanteti55@gmail.com"
    asyncio.run(check_user(email_to_check))

