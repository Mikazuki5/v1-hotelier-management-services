# Hotelier Management System

Backend API untuk manajemen operasional hotel (Reservasi, Penagihan, Inventory, & Housekeeping).
Dibangun menggunakan **Bun**, **Hono**, dan **Prisma ORM** (PostgreSQL).

## Instalasi & Menjalankan

```bash
# Install dependencies
bun install

# Menjalankan server development
yarn run dev
```
Server akan berjalan di `http://localhost:3000`.

---

## Dokumentasi API Lengkap

Setiap Endpoint yang membutuhkan autorisasi wajib menyertakan Header:
`Authorization: Bearer <token>`

### 📌 Auth

#### `POST` /auth/register
> Mendaftarkan akun admin/staff baru

- **Auth Required**: ❌ No
- **Required Body**: `email, password, employeeId, firstName, lastName, phoneNumber, department, shift`
- **Payload Example**: 
```json
{
  "email": {
    "type": "string"
  },
  "password": {
    "type": "string"
  },
  "employeeId": {
    "type": "string"
  },
  "firstName": {
    "type": "string"
  },
  "lastName": {
    "type": "string"
  },
  "phoneNumber": {
    "type": "string"
  },
  "department": {
    "type": "string"
  },
  "shift": {
    "type": "string",
    "enum": [
      "MORNING",
      "EVENING",
      "NIGHT"
    ]
  },
  "role": {
    "type": "string",
    "enum": [
      "ADMIN",
      "MANAGER",
      "RECEPTIONIST",
      "HOUSEKEEPER",
      "ACCOUNTANT"
    ]
  }
}
```

#### `POST` /auth/login
> Login dan mendapatkan JWT Token

- **Auth Required**: ❌ No
- **Required Body**: `email, password`
- **Payload Example**: 
```json
{
  "email": {
    "type": "string"
  },
  "password": {
    "type": "string"
  }
}
```

#### `POST` /auth/refresh
> Mendapatkan Access Token baru menggunakan Refresh Token

- **Auth Required**: ❌ No
- **Required Body**: `refreshToken`
- **Payload Example**: 
```json
{
  "refreshToken": {
    "type": "string"
  }
}
```

---

### 📌 Guests

#### `GET` /guests
> Mendapatkan daftar semua tamu

- **Auth Required**: ✅ Yes
- **Query Parameters**: `?page=1&limit=10`
- **Paginated Response**:
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 100,
    "totalPages": 10
  }
}
```

#### `POST` /guests
> Mendaftarkan profil tamu baru

- **Auth Required**: ✅ Yes
- **Payload Example**: 
```json
{
  "identityType": {
    "type": "string",
    "example": "KTP"
  },
  "identityNumber": {
    "type": "string"
  },
  "firstName": {
    "type": "string"
  },
  "lastName": {
    "type": "string"
  },
  "email": {
    "type": "string"
  },
  "phoneNumber": {
    "type": "string"
  }
}
```

---

### 📌 Reservations

#### `POST` /reservations
> Membuat Reservasi (Otomatis menerbitkan Invoice)

- **Auth Required**: ✅ Yes
- **Payload Example**: 
```json
{
  "guestId": {
    "type": "string"
  },
  "roomId": {
    "type": "string"
  },
  "expectedCheckIn": {
    "type": "string",
    "format": "date-time"
  },
  "expectedCheckOut": {
    "type": "string",
    "format": "date-time"
  },
  "adultCount": {
    "type": "integer"
  },
  "bookingSource": {
    "type": "string",
    "example": "WALK_IN"
  }
}
```

---

### 📌 Billing & Invoice

#### `POST` /invoices/{id}/items
> Menambahkan tagihan ekstra (Restoran, Laundry, dll) ke dalam Invoice

- **Auth Required**: ✅ Yes
- **Payload Example**: 
```json
{
  "itemType": {
    "type": "string",
    "example": "FNB_RESTAURANT"
  },
  "description": {
    "type": "string"
  },
  "amount": {
    "type": "number"
  },
  "quantity": {
    "type": "integer"
  }
}
```

#### `POST` /payments
> Memproses pelunasan (Payment) Invoice

- **Auth Required**: ✅ Yes
- **Payload Example**: 
```json
{
  "invoiceId": {
    "type": "string"
  },
  "paymentMethod": {
    "type": "string",
    "example": "CREDIT_CARD"
  },
  "amount": {
    "type": "number"
  },
  "referenceCode": {
    "type": "string"
  }
}
```

---

### 📌 Housekeeping

#### `POST` /housekeeping
> Membuat tugas kebersihan kamar

- **Auth Required**: ✅ Yes
- **Payload Example**: 
```json
{
  "roomId": {
    "type": "string"
  },
  "assignedTo": {
    "type": "string"
  },
  "taskType": {
    "type": "string",
    "example": "DAILY_CLEANING"
  }
}
```

#### `PUT` /housekeeping/{id}/status
> Mengubah status tugas Housekeeping (Bila COMPLETED, kamar otomatis jadi AVAILABLE)

- **Auth Required**: ✅ Yes
- **Payload Example**: 
```json
{
  "status": {
    "type": "string",
    "example": "COMPLETED"
  }
}
```

---

### 📌 Inventory

#### `POST` /inventory
> Mendaftarkan item stok gudang baru

- **Auth Required**: ✅ Yes
- **Payload Example**: 
```json
{
  "skuCode": {
    "type": "string"
  },
  "name": {
    "type": "string"
  },
  "category": {
    "type": "string",
    "example": "AMENITIES"
  },
  "unitType": {
    "type": "string",
    "example": "PCS"
  }
}
```

#### `POST` /inventory/{id}/logs
> Mencatat mutasi barang keluar masuk (STOCK_IN, STOCK_OUT)

- **Auth Required**: ✅ Yes
- **Payload Example**: 
```json
{
  "actionType": {
    "type": "string",
    "example": "STOCK_IN"
  },
  "quantity": {
    "type": "integer"
  },
  "notes": {
    "type": "string"
  }
}
```

---

### 📌 Dashboard

#### `GET` /dashboard
> Mendapatkan data agregasi dashboard

- **Auth Required**: ✅ Yes

---

### 📌 Rooms

#### `GET` /rooms
> Mendapatkan daftar semua kamar

- **Auth Required**: ✅ Yes
- **Query Parameters**: `?page=1&limit=10`
- **Paginated Response**:
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 100,
    "totalPages": 10
  }
}
```

#### `POST` /rooms
> Menambahkan kamar baru

- **Auth Required**: ✅ Yes
- **Required Body**: `roomNumber, roomTypeId, floorNumber`
- **Payload Example**: 
```json
{
  "roomNumber": {
    "type": "string"
  },
  "roomTypeId": {
    "type": "string"
  },
  "floorNumber": {
    "type": "integer"
  },
  "isSmoking": {
    "type": "boolean",
    "default": false
  },
  "facilities": {
    "type": "array",
    "items": {
      "type": "string"
    },
    "example": [
      "Lantai Atas",
      "Menghadap Kolam",
      "Wi-Fi Cepat",
      "TV 43 Inch"
    ]
  }
}
```

---

### 📌 Users

#### `GET` /users
> Mendapatkan daftar semua pengguna (khusus ADMIN)

- **Auth Required**: ✅ Yes
- **Query Parameters**: `?page=1&limit=10`
- **Paginated Response**:
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 100,
    "totalPages": 10
  }
}
```

#### `GET` /users/{id}
> Mendapatkan detail pengguna berdasarkan ID (khusus ADMIN)

- **Auth Required**: ✅ Yes

#### `PUT` /users/{id}
> Memperbarui profil/jabatan pengguna (khusus ADMIN)

- **Auth Required**: ✅ Yes
- **Payload Example**: 
```json
{
  "employeeId": {
    "type": "string"
  },
  "firstName": {
    "type": "string"
  },
  "lastName": {
    "type": "string"
  },
  "phoneNumber": {
    "type": "string"
  },
  "department": {
    "type": "string"
  },
  "shift": {
    "type": "string",
    "enum": [
      "MORNING",
      "EVENING",
      "NIGHT"
    ]
  },
  "role": {
    "type": "string",
    "enum": [
      "ADMIN",
      "MANAGER",
      "RECEPTIONIST",
      "HOUSEKEEPER",
      "ACCOUNTANT"
    ]
  },
  "isActive": {
    "type": "boolean"
  }
}
```

#### `DELETE` /users/{id}
> Menonaktifkan pengguna (soft delete, khusus ADMIN)

- **Auth Required**: ✅ Yes

---

