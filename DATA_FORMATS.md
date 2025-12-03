# Trader Analyzer Data Formats Documentation

This document provides comprehensive documentation of all data formats, structures, and expectations used in the Trader Analyzer application.

## Table of Contents

1. [CSV Data Formats](#csv-data-formats)
2. [JSON Data Structures](#json-data-structures)
3. [API Endpoints and Responses](#api-endpoints-and-responses)
4. [Data Validation Rules](#data-validation-rules)
5. [Error Handling](#error-handling)

## CSV Data Formats

### 1. Trade Data (`bitmex_trades.csv`)

**Headers**: `id,datetime,symbol,side,price,amount,cost,fee_cost,fee_currency,execID`

**Field Descriptions**:
- `id`: Unique trade identifier (string)
- `datetime`: Trade execution timestamp (ISO format string)
- `symbol`: Trading pair symbol (e.g., "XBTUSD")
- `side`: Trade direction ("buy" or "sell")
- `price`: Execution price (number)
- `amount`: Trade quantity (number)
- `cost`: Total cost of trade (number)
- `fee_cost`: Transaction fee cost (number)
- `fee_currency`: Fee currency (string, e.g., "XBT")
- `execID`: Execution identifier (string)

**Validation Rules**:
- All numeric fields must be valid numbers
- `side` must be either "buy" or "sell"
- `datetime` must be parseable as ISO timestamp
- All required headers must be present

### 2. Order Data (`bitmex_orders.csv`)

**Headers**: `orderID,symbol,side,ordType,orderQty,price,stopPx,avgPx,cumQty,ordStatus,timestamp,text`

**Field Descriptions**:
- `orderID`: Unique order identifier (string)
- `symbol`: Trading pair symbol (string)
- `side`: Order direction ("Buy" or "Sell")
- `ordType`: Order type ("Limit", "Market", "Stop", "StopLimit")
- `orderQty`: Order quantity (number)
- `price`: Limit price (number or empty)
- `stopPx`: Stop price (number or empty)
- `avgPx`: Average execution price (number or empty)
- `cumQty`: Cumulative filled quantity (number)
- `ordStatus`: Order status ("Filled", "Canceled", "Rejected", "New", "PartiallyFilled")
- `timestamp`: Order timestamp (ISO format string)
- `text`: Additional order information (string)

**Validation Rules**:
- `side` must be "Buy" or "Sell"
- `ordType` must be one of the allowed order types
- `ordStatus` must be one of the allowed statuses
- Numeric fields must be valid numbers or empty

### 3. Wallet History (`bitmex_wallet_history.csv`)

**Headers**: `transactID,account,currency,transactType,amount,fee,transactStatus,address,tx,text,timestamp,walletBalance,marginBalance`

**Field Descriptions**:
- `transactID`: Unique transaction identifier (string)
- `account`: Account number (number)
- `currency`: Transaction currency (string, e.g., "XBt")
- `transactType`: Transaction type ("RealisedPNL", "Funding", "Deposit", "Withdrawal", etc.)
- `amount`: Transaction amount (number, in satoshis for BTC)
- `fee`: Transaction fee (number)
- `transactStatus`: Transaction status (string)
- `address`: Wallet address (string or empty)
- `tx`: Transaction hash (string or empty)
- `text`: Additional information (string)
- `timestamp`: Transaction timestamp (ISO format string)
- `walletBalance`: Wallet balance after transaction (number)
- `marginBalance`: Margin balance after transaction (number or empty)

**Validation Rules**:
- `currency` should be "XBt" for BitMEX
- `transactType` must be one of the allowed transaction types
- Numeric fields must be valid numbers

### 4. Execution History (`bitmex_executions.csv`)

**Headers**: `execID,orderID,symbol,side,lastQty,lastPx,execType,ordType,ordStatus,execCost,execComm,timestamp,text`

**Field Descriptions**:
- `execID`: Unique execution identifier (string)
- `orderID`: Parent order identifier (string)
- `symbol`: Trading pair symbol (string)
- `side`: Execution direction ("Buy" or "Sell")
- `lastQty`: Last executed quantity (number)
- `lastPx`: Last executed price (number)
- `execType`: Execution type (string)
- `ordType`: Order type (string)
- `ordStatus`: Order status (string)
- `execCost`: Execution cost (number)
- `execComm`: Execution commission (number)
- `timestamp`: Execution timestamp (ISO format string)
- `text`: Additional information (string)

**Validation Rules**:
- `side` must be "Buy" or "Sell"
- All numeric fields must be valid numbers

## JSON Data Structures

### 1. Account Summary (`bitmex_account_summary.json`)

```json
{
  "exportDate": "ISO timestamp",
  "user": {
    "id": number,
    "username": "string",
    "email": "string"
  },
  "wallet": {
    "walletBalance": number,
    "marginBalance": number,
    "availableMargin": number,
    "unrealisedPnl": number,
    "realisedPnl": number
  },
  "positions": [
    {
      "symbol": "string",
      "currentQty": number,
      "avgEntryPrice": number,
      "unrealisedPnl": number,
      "liquidationPrice": number
    }
  ]
}
```

### 2. Trader Profile Analysis (`trader_profile_analysis.json`)

```json
{
  "basic_stats": {
    "total_orders": number,
    "filled_orders": number,
    "canceled_orders": number,
    "fill_rate": number,
    "order_types": {
      "Limit": number,
      "Market": number,
      "Stop": number,
      "StopLimit": number
    }
  },
  "risk_preference": {
    "avg_order_size": number,
    "max_order_size": number,
    "min_order_size": number,
    "large_order_ratio": number,
    "risk_score": number,
    "risk_level": "High Risk" | "Medium Risk" | "Low Risk"
  },
  "trading_frequency": {
    "total_trading_days": number,
    "daily_avg_trades": number,
    "avg_trade_interval_minutes": number,
    "frequency_score": number,
    "frequency_level": "High Frequency" | "Medium Frequency" | "Low Frequency"
  },
  "discipline_scores": {
    "limit_order_ratio": number,
    "cancel_ratio": number,
    "discipline_score": number,
    "patience_score": number,
    "discipline_level": "Highly Disciplined" | "Moderately Disciplined" | "Needs Improvement",
    "patience_level": "Very Patient" | "Moderately Patient" | "Impulsive"
  },
  "trading_patterns": {
    "hour_distribution": { "0": number, "1": number, ..., "23": number },
    "weekday_distribution": { "0": number, "1": number, ..., "6": number },
    "most_active_hour": number,
    "most_active_day": "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun"
  },
  "pnl_analysis": {
    "total_pnl_btc": number,
    "total_trades": number,
    "winning_trades": number,
    "losing_trades": number,
    "win_rate": number,
    "avg_win_btc": number,
    "avg_loss_btc": number,
    "profit_factor": number
  },
  "summary": {
    "trader_type": "Aggressive Day Trader" | "Conservative Day Trader" | "Bold Swing Trader" | "Conservative Value Investor" | "Balanced Short-term Trader" | "Comprehensive Trader",
    "risk_level": "High Risk" | "Medium Risk" | "Low Risk",
    "frequency_level": "High Frequency" | "Medium Frequency" | "Low Frequency",
    "discipline_level": "Highly Disciplined" | "Moderately Disciplined" | "Needs Improvement",
    "overall_score": number,
    "advice": ["string", "string", "string"]
  }
}
```

## API Endpoints and Responses

### 1. Backend Prediction API

**Endpoint**: `POST /api/backend/predict`

**Request Body**:
```json
{
  "credentials": {
    "api_key": "string",
    "api_secret": "string",
    "exchange": "bitmex"
  },
  "symbol": "BTC/USD",
  "current_price": number
}
```

**Response**:
```json
{
  "prediction": {
    "action": "buy" | "sell" | "hold",
    "confidence": "string",
    "reasoning": ["string", "string"]
  },
  "similar_situations": [
    {
      "timestamp": "string",
      "action": "buy" | "sell" | "hold",
      "price": number,
      "pnl": number,
      "similarity": "string",
      "market_context": {
        "rsi": "string",
        "price_change_24h": "string"
      }
    }
  ],
  "pattern_stats": {
    "total_patterns": number,
    "action_distribution": { "buy": number, "sell": number, "hold": number },
    "avg_pnl_by_action": { "buy": number, "sell": number, "hold": number },
    "date_range": {
      "start": "string",
      "end": "string"
    }
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing required fields
- `401 Unauthorized`: Invalid API credentials
- `500 Internal Server Error`: Backend processing error
- `503 Service Unavailable`: Backend service connection failed

### 2. Exchange Management API

**Endpoint**: `GET /api/exchanges`

**Response**:
```json
{
  "success": true,
  "availableExchanges": ["bitmex", "polymarket", "kalishi", "sports"],
  "exchangeConfigs": {
    "bitmex": {
      "name": "BitMEX",
      "type": "crypto",
      "supportsTestnet": true,
      "rateLimits": {
        "requestsPerSecond": 10,
        "ordersPerMinute": 200
      },
      "precision": {
        "price": 0.5,
        "amount": 0.00001
      },
      "features": {
        "marginTrading": true,
        "futuresTrading": true,
        "spotTrading": false,
        "optionsTrading": false,
        "sportsTrading": false,
        "p2pTrading": false
      }
    },
    "polymarket": {
      "name": "Polymarket",
      "type": "prediction",
      "supportsTestnet": false,
      "rateLimits": {
        "requestsPerSecond": 5,
        "ordersPerMinute": 50
      },
      "precision": {
        "price": 0.01,
        "amount": 1
      },
      "features": {
        "marginTrading": false,
        "futuresTrading": false,
        "spotTrading": false,
        "optionsTrading": false,
        "sportsTrading": false,
        "p2pTrading": false
      }
    },
    "kalishi": {
      "name": "Kalishi",
      "type": "p2p",
      "supportsTestnet": false,
      "rateLimits": {
        "requestsPerSecond": 3,
        "ordersPerMinute": 20
      },
      "precision": {
        "price": 1,
        "amount": 0.00001
      },
      "features": {
        "marginTrading": false,
        "futuresTrading": false,
        "spotTrading": true,
        "optionsTrading": false,
        "sportsTrading": false,
        "p2pTrading": true
      }
    },
    "sports": {
      "name": "Sports Trading",
      "type": "sports",
      "supportsTestnet": false,
      "rateLimits": {
        "requestsPerSecond": 2,
        "ordersPerMinute": 10
      },
      "precision": {
        "price": 0.01,
        "amount": 1
      },
      "features": {
        "marginTrading": false,
        "futuresTrading": false,
        "spotTrading": false,
        "optionsTrading": false,
        "sportsTrading": true,
        "p2pTrading": false
      }
    }
  }
}
```

**Endpoint**: `POST /api/exchanges`

**Request Body** (Set Active Exchange):
```json
{
  "operation": "set_active_exchange",
  "exchange": "bitmex",
  "credentials": {
    "api_key": "string",
    "api_secret": "string",
    "username": "string"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Exchange bitmex set as active",
  "activeExchange": "bitmex"
}
```

**Request Body** (Get Market Data):
```json
{
  "operation": "get_market_data",
  "symbol": "BTC/USD"
}
```

**Response**:
```json
{
  "success": true,
  "marketData": {
    "symbol": "BTC/USD",
    "lastPrice": 50000,
    "bid": 49500,
    "ask": 50500,
    "volume": 1000,
    "timestamp": "2024-12-01T12:00:00Z",
    "exchangeSpecific": {
      "fundingRate": 0.0001,
      "openInterest": 10000000
    }
  }
}
```

**Request Body** (Place Order):
```json
{
  "operation": "place_order",
  "orderParams": {
    "symbol": "BTC/USD",
    "side": "buy",
    "type": "limit",
    "amount": 0.1,
    "price": 50000
  }
}
```

**Response**:
```json
{
  "success": true,
  "orderResult": {
    "id": "order_abc123",
    "symbol": "BTC/USD",
    "side": "buy",
    "type": "limit",
    "amount": 0.1,
    "price": 50000,
    "status": "open",
    "timestamp": "2024-12-01T12:00:00Z",
    "exchangeSpecific": {
      "orderType": "Limit",
      "timeInForce": "GTC"
    }
  }
}
```

**Request Body** (Get Balance):
```json
{
  "operation": "get_balance"
}
```

**Response**:
```json
{
  "success": true,
  "balance": {
    "total": 10000,
    "available": 8000,
    "currencies": {
      "XBT": {
        "total": 1.2,
        "available": 1.0,
        "reserved": 0.2
      },
      "USD": {
        "total": 50000,
        "available": 40000,
        "reserved": 10000
      }
    },
    "timestamp": "2024-12-01T12:00:00Z"
  }
}
```

**Request Body** (Check Health):
```json
{
  "operation": "check_health"
}
```

**Response**:
```json
{
  "success": true,
  "healthStatus": {
    "bitmex": {
      "status": "online",
      "responseTimeMs": 45,
      "lastChecked": "2024-12-01T12:00:00Z",
      "errorRate": 0.01,
      "uptimePercentage": 99.95,
      "maintenanceMode": false,
      "apiStatus": {
        "marketData": "operational",
        "trading": "operational",
        "account": "operational"
      },
      "exchangeSpecific": {
        "systemLoad": 0.35,
        "orderBookDepth": "excellent",
        "liquidityScore": 0.98
      }
    },
    "polymarket": {
      "status": "online",
      "responseTimeMs": 85,
      "lastChecked": "2024-12-01T12:00:00Z",
      "errorRate": 0.02,
      "uptimePercentage": 99.90,
      "maintenanceMode": false,
      "apiStatus": {
        "marketData": "operational",
        "trading": "operational",
        "account": "operational"
      }
    },
    "kalishi": {
      "status": "online",
      "responseTimeMs": 120,
      "lastChecked": "2024-12-01T12:00:00Z",
      "errorRate": 0.03,
      "uptimePercentage": 99.85,
      "maintenanceMode": false,
      "apiStatus": {
        "marketData": "operational",
        "trading": "operational",
        "account": "operational"
      }
    },
    "sports": {
      "status": "online",
      "responseTimeMs": 65,
      "lastChecked": "2024-12-01T12:00:00Z",
      "errorRate": 0.015,
      "uptimePercentage": 99.92,
      "maintenanceMode": false,
      "apiStatus": {
        "marketData": "operational",
        "trading": "operational",
        "account": "operational"
      }
    }
  }
}
```

**Request Body** (Get Statistics):
```json
{
  "operation": "get_statistics"
}
```

**Response**:
```json
{
  "success": true,
  "statistics": {
    "bitmex": {
      "totalRequests": 15000,
      "successfulRequests": 14850,
      "failedRequests": 150,
      "averageResponseTimeMs": 75,
      "peakResponseTimeMs": 350,
      "requestsByType": {
        "marketData": 8000,
        "trading": 4000,
        "account": 2000,
        "other": 1000
      },
      "performanceTrends": {
        "responseTimeTrend": "stable",
        "successRateTrend": "improving"
      },
      "lastReset": "2024-11-30T12:00:00Z",
      "sessionDuration": "24h 30m",
      "exchangeSpecific": {
        "orderFillRate": 0.92,
        "slippageScore": 0.05,
        "liquidityProviderCount": 45
      }
    },
    "polymarket": {
      "totalRequests": 8000,
      "successfulRequests": 7840,
      "failedRequests": 160,
      "averageResponseTimeMs": 110,
      "peakResponseTimeMs": 420,
      "requestsByType": {
        "marketData": 5000,
        "trading": 2000,
        "account": 800,
        "other": 200
      },
      "performanceTrends": {
        "responseTimeTrend": "stable",
        "successRateTrend": "stable"
      },
      "lastReset": "2024-11-30T12:00:00Z",
      "sessionDuration": "24h 15m"
    },
    "kalishi": {
      "totalRequests": 6000,
      "successfulRequests": 5880,
      "failedRequests": 120,
      "averageResponseTimeMs": 145,
      "peakResponseTimeMs": 580,
      "requestsByType": {
        "marketData": 3000,
        "trading": 1500,
        "account": 1000,
        "other": 500
      },
      "performanceTrends": {
        "responseTimeTrend": "improving",
        "successRateTrend": "improving"
      },
      "lastReset": "2024-11-30T12:00:00Z",
      "sessionDuration": "24h 10m"
    },
    "sports": {
      "totalRequests": 4000,
      "successfulRequests": 3920,
      "failedRequests": 80,
      "averageResponseTimeMs": 95,
      "peakResponseTimeMs": 380,
      "requestsByType": {
        "marketData": 2000,
        "trading": 1000,
        "account": 600,
        "other": 400
      },
      "performanceTrends": {
        "responseTimeTrend": "stable",
        "successRateTrend": "stable"
      },
      "lastReset": "2024-11-30T12:00:00Z",
      "sessionDuration": "24h 5m"
    }
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Invalid exchange credentials
- `500 Internal Server Error`: Exchange operation failed
- `404 Not Found`: Exchange not found

## Data Validation Rules

### CSV Validation

1. **Header Validation**: All required headers must be present
2. **Data Type Validation**: Numeric fields must contain valid numbers
3. **Enum Validation**: Fields with limited values must match allowed options
4. **Structural Validation**: Data rows must match header count
5. **Content Validation**: Required fields must not be empty

### JSON Validation

1. **Schema Validation**: JSON must conform to expected structure
2. **Type Validation**: Fields must have correct data types
3. **Range Validation**: Numeric values must be within reasonable ranges
4. **Consistency Validation**: Related fields must be consistent

## Error Handling

### API Error Handling

The system implements comprehensive error handling:

1. **Request Validation**: Validates required fields and data types
2. **Response Validation**: Validates backend response structure
3. **Connection Handling**: Handles network and service connectivity issues
4. **Error Classification**: Returns appropriate HTTP status codes
5. **Error Logging**: Logs detailed error information for debugging

### Data Processing Error Handling

1. **File Validation**: Validates data files before processing
2. **Graceful Degradation**: Continues processing with available data
3. **Error Reporting**: Provides clear error messages
4. **Validation Warnings**: Issues warnings for non-critical issues

## Performance Optimization

### Data Processing

1. **Batch Processing**: Processes data in manageable batches
2. **Memory Management**: Optimizes memory usage for large datasets
3. **Error Recovery**: Recovers gracefully from processing errors
4. **Progress Tracking**: Provides progress feedback during processing

### API Performance

1. **Request Throttling**: Implements rate limiting
2. **Caching**: Caches frequent requests where appropriate
3. **Connection Pooling**: Reuses connections for efficiency
4. **Timeout Handling**: Implements reasonable timeouts

## Data Flow

1. **Data Collection**: Scripts export data from exchange APIs
2. **Data Validation**: Validation scripts verify data integrity
3. **Data Processing**: Analysis scripts process and analyze data
4. **Data Visualization**: Frontend components display processed data
5. **API Integration**: Clean separation between frontend and backend

## Best Practices

1. **Data Backup**: Regularly backup data files
2. **Version Control**: Track changes to data processing logic
3. **Testing**: Test with sample data before full processing
4. **Monitoring**: Monitor data quality and processing performance
5. **Documentation**: Keep documentation updated with changes
