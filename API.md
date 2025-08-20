# P2P Transfer API Documentation

## Overview
This API provides P2P transfer functionality with Circle blockchain integration for both internal users and external wallet addresses.

## Base URL
```
http://localhost:4000/api
```

## Authentication
All endpoints require user identification via `senderId` or `userId` parameters.

## Transfer Endpoints

### 1. Request Security Code
**POST** `/transfers/request-security-code`

Request a 6-digit security code for transfer verification.

**Request Body:**
```json
{
  "recipient": "user@email.com",
  "recipientType": "internal",
  "amount": 100.50,
  "token": "USDC",
  "memo": "Payment for services",
  "senderId": "user123"
}
```

**Parameters:**
- `recipient` (string, required): 
  - For internal users: email, UID, or wallet address
  - For external wallets: wallet address only (0x... or similar)
- `recipientType` (string, required): "internal" or "external"
- `amount` (number, required): Transfer amount
- `token` (string, required): Token symbol (USDC, USDT, ETH)
- `memo` (string, optional): Transfer memo/note
- `senderId` (string, required): Sender's UID, email, or wallet address

**Response:**
```json
{
  "success": true,
  "message": "Security code sent successfully",
  "data": {
    "transferId": "uuid-here",
    "securityCode": "123456"
  }
}
```

### 2. Create Transfer
**POST** `/transfers`

Execute the transfer after security code verification.

**Request Body:**
```json
{
  "recipient": "user@email.com",
  "recipientType": "internal",
  "amount": 100.50,
  "token": "USDC",
  "memo": "Payment for services",
  "securityCode": "123456",
  "transferId": "uuid-here",
  "senderId": "user123"
}
```

**Parameters:**
- Same as request security code, plus:
- `securityCode` (string, required): 6-digit security code
- `transferId` (string, required): Transfer ID from security code request

**Response:**
```json
{
  "success": true,
  "message": "Transfer completed successfully",
  "data": {
    "transferId": "transfer-db-id",
    "circleTransactionId": "circle-tx-id",
    "status": "completed",
    "transactionHash": "0x...",
    "blockchain": "ethereum",
    "amount": 100.50,
    "token": "USDC"
  }
}
```

### 3. Get User Transfers
**GET** `/transfers?userId=user123`

Get user's transfer history.

**Query Parameters:**
- `userId` (string, required): User's UID, email, or wallet address

**Response:**
```json
{
  "success": true,
  "message": "User transfers retrieved successfully",
  "data": {
    "transfers": [
      {
        "id": "transfer-id",
        "senderId": "user123",
        "recipient": "0x742d35...",
        "recipientType": "external",
        "amount": 100.50,
        "token": "USDC",
        "status": "completed",
        "blockchain": "ethereum",
        "circleTransactionStatus": "confirmed",
        "transactionHash": "0x...",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "completedAt": "2024-01-01T00:01:00.000Z"
      }
    ],
    "total": 1
  }
}
```

### 4. Get Transfer Details
**GET** `/transfers/:id?userId=user123`

Get specific transfer details.

**Path Parameters:**
- `id` (string, required): Transfer ID

**Query Parameters:**
- `userId` (string, required): User's UID, email, or wallet address

**Response:**
```json
{
  "success": true,
  "message": "Transfer details retrieved successfully",
  "data": {
    "id": "transfer-id",
    "senderId": "user123",
    "recipient": "0x742d35...",
    "recipientType": "external",
    "amount": 100.50,
    "token": "USDC",
    "memo": "Payment for services",
    "status": "completed",
    "blockchain": "ethereum",
    "circleTransactionId": "circle-tx-id",
    "circleTransactionStatus": "confirmed",
    "transactionHash": "0x...",
    "gasUsed": 21000,
    "gasPrice": 20000000000,
    "feeAmount": 0.00042,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:01:00.000Z",
    "completedAt": "2024-01-01T00:01:00.000Z"
  }
}
```

### 5. Get Transfer Status
**GET** `/transfers/:id/status?userId=user123`

Get current transfer status and Circle transaction status.

**Path Parameters:**
- `id` (string, required): Transfer ID

**Query Parameters:**
- `userId` (string, required): User's UID, email, or wallet address

**Response:**
```json
{
  "success": true,
  "message": "Transfer status retrieved successfully",
  "data": {
    "id": "transfer-id",
    "status": "completed",
    "blockchain": "ethereum",
    "circleTransactionId": "circle-tx-id",
    "circleTransactionStatus": "confirmed",
    "transactionHash": "0x...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:01:00.000Z",
    "completedAt": "2024-01-01T00:01:00.000Z",
    "circleStatus": {
      "id": "circle-tx-id",
      "status": "confirmed",
      "transactionHash": "0x...",
      "amount": "100.50",
      "fee": "0.00042"
    }
  }
}
```

## Transfer Types

### Internal Transfers
- **Recipient**: Registered users (email, UID, or wallet address)
- **Validation**: Recipient must exist in the system
- **Destination**: Recipient's wallet address on the selected blockchain
- **Processing**: Instant internal transfer

### External Transfers
- **Recipient**: External wallet addresses only
- **Validation**: Wallet address format validation (no emails or UIDs)
- **Destination**: Direct blockchain transfer to external address
- **Processing**: On-chain transaction via Circle API

## Supported Blockchains
- **Ethereum**: Mainnet
- **Polygon**: Polygon network
- **Arbitrum**: Arbitrum One network

## Supported Tokens
- **USDC**: USD Coin
- **USDT**: Tether
- **ETH**: Ethereum (native token)

## Error Responses

### Validation Errors (400)
```json
{
  "success": false,
  "message": "Invalid recipient type. Must be 'internal' or 'external'",
  "data": null
}
```

### Authentication Errors (403)
```json
{
  "success": false,
  "message": "Access denied to this transfer",
  "data": null
}
```

### Not Found Errors (404)
```json
{
  "success": false,
  "message": "Transfer not found",
  "data": null
}
```

### Service Unavailable (503)
```json
{
  "success": false,
  "message": "Blockchain service temporarily unavailable. Please try again later.",
  "data": {
    "transferId": "transfer-id",
    "status": "failed",
    "error": "Circle API service not available"
  }
}
```

## Circle API Integration

### Transaction Flow
1. **Security Code Request**: Generate and send 6-digit code
2. **Transfer Creation**: Validate code and create transfer record
3. **Circle Transaction**: Submit transaction to Circle API
4. **Status Tracking**: Monitor transaction status via Circle API
5. **Completion**: Update local records with final status

### Fee Structure
- **Fee Level**: Configurable (LOW, MEDIUM, HIGH)
- **Default**: MEDIUM
- **Gas Fees**: Handled by Circle API
- **Network Fees**: Vary by blockchain and congestion

### Security Features
- **6-Digit Security Codes**: Time-limited verification
- **User Validation**: Sender and recipient verification
- **Access Control**: Users can only access their own transfers
- **Audit Trail**: Complete transaction history and status tracking

## Rate Limiting
- **Window**: 15 minutes (900,000 ms)
- **Max Requests**: 100 per window
- **Scope**: Per IP address

## Environment Variables
```bash
# Circle API Configuration
CIRCLE_API_KEY=your_circle_api_key_here
CIRCLE_ENTITY_SECRET=your_circle_entity_secret_here

# Database
MONGODB_URI=mongodb://localhost:27017/p2p-backend

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Testing
Use the provided test endpoints to verify functionality:
- **Health Check**: `GET /health`
- **Logs**: `GET /logs` (development only)
