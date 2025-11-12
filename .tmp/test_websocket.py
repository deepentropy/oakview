"""
Test VoltTrading WebSocket Connection
"""
import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:8000/ws"
    print(f"Connecting to {uri}...")

    try:
        async with websockets.connect(uri) as websocket:
            print("✓ Connected to WebSocket")

            # Wait for messages
            print("Listening for messages (10 seconds)...")
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                data = json.loads(message)
                print(f"✓ Received message: {data.get('type', 'unknown')}")
                print(f"  Data: {json.dumps(data, indent=2)}")
            except asyncio.TimeoutError:
                print("⚠ No messages received in 10 seconds (this may be normal)")

            print("\n✓ WebSocket connection test passed")

    except Exception as e:
        print(f"✗ WebSocket connection failed: {e}")
        return False

    return True

if __name__ == "__main__":
    asyncio.run(test_websocket())
