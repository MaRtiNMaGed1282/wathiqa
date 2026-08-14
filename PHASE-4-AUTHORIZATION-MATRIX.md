# Wathiqa — Phase 4 Authorization Matrix

## Role model

| Area | Admin | Lawyer | Assistant |
|---|---:|---:|---:|
| Clients | Full | Full except delete | Full except delete |
| Cases | Full | Full except delete | Full except delete |
| Case Profile | Full | Full except delete/financial restrictions | Operational only |
| Calendar | Full | Full | Operational; restricted destructive actions |
| Services | Full | Full except delete | Full except delete |
| Service Profile | Full | Full | Operational; no financial |
| Revenues | Yes | Yes | No |
| Reports | Full | Full | Operational only |
| Dashboard | Full | Full | Operational; no financial |
| Notifications | Own | Own | Own |
| Office Profile | Full | View | View |
| Users | Full | No | No |
| Legal Library | Read | Read | Read |
| Password | Own + Admin resets others | Own | Own |

## Endpoint matrix

| Page/Feature | Endpoint | Method | Auth | Allowed roles | Purpose |
|---|---|---|---|---|---|
| Authentication | `/api/auth/login` | POST | No | Public | Login |
| Authentication | `/api/auth/change-password` | POST | Yes | All roles | Current-user password change |
| Users | `/api/users/*` | GET/POST/PUT/DELETE | Yes | Admin | User administration |
| Clients | `/api/clients` | GET/POST/PUT | Yes | All roles | Client operations |
| Clients | `/api/clients/:id` | GET | Yes | All roles | Client profile |
| Clients | `/api/clients/:id` | DELETE | Yes | Admin | Client deletion |
| Client financial | `/api/clients/:id/financial-summary` | GET | Yes | Admin, Lawyer | Financial summary |
| Client financial | `/api/clients/:id/cases-financial` | GET | Yes | Admin, Lawyer | Financial case data |
| Revenues | `/api/clients/revenues/*` | GET | Yes | Admin, Lawyer | Revenue data |
| Revenue dashboard | `/api/clients/dashboard/monthly-revenue` | GET | Yes | Admin, Lawyer | Monthly revenue |
| Debtors | `/api/clients/dashboard/top-debtors` | GET | Yes | Admin, Lawyer | Receivables |
| Recent payments | `/api/clients/dashboard/recent-payments` | GET | Yes | Admin, Lawyer | Payments |
| Revenue reports | `/api/clients/reports/top-revenue-items` | GET | Yes | Admin, Lawyer | Revenue report data |
| Cases | `/api/cases` | GET/POST/PUT | Yes | All roles | Case operations |
| Cases | `/api/cases/:id` | GET | Yes | All roles | Case profile |
| Cases | `/api/cases/:id` | DELETE | Yes | Admin | Case deletion |
| Services | `/api/services` | GET/POST/PUT | Yes | All roles | Service operations |
| Services | `/api/services/:id` | DELETE | Yes | Admin | Service deletion |
| Hearings | `/api/hearings/*` | GET/POST/PUT | Yes | All roles | Calendar operations |
| Hearings | `/api/hearings/:id` | DELETE | Yes | Admin, Lawyer | Restricted calendar deletion |
| Case files | `/api/files/*` | GET/POST | Yes | All roles | Case file access/upload |
| Case files | `/api/files/:id` | DELETE | Yes | Admin, Lawyer | Case file deletion |
| Attorneys | `/api/attorneys/*` | GET/POST | Yes | All roles | Attorney file operations |
| Attorneys | `/api/attorneys/:id` | DELETE | Yes | Admin, Lawyer | Attorney file deletion |
| Payments | `/api/payments/*` | GET/POST/DELETE | Yes | Admin, Lawyer | Financial transactions |
| Case expenses | `/api/case-expenses/*` | GET/POST/DELETE | Yes | Admin, Lawyer | Case expenses |
| Service expenses | `/api/expenses/*` | GET/POST/DELETE | Yes | Admin, Lawyer | Service expenses |
| Notifications | `/api/notifications/*` | GET/PUT/DELETE | Yes | Own user only | Own notifications |
| Activity | `/api/activity/*` | GET | Yes | All roles | Activity visibility |
| Dashboard | `/api/dashboard` | GET | Yes | All roles | Dashboard; financial data only Admin/Lawyer |
| Legal Library | `/api/library/laws*` | GET | Yes | All roles | Read-only legal library |
| Office | `/api/office` | GET | Yes | All roles | View office profile |
| Office | `/api/office` | POST | Yes | Admin | Manage office |
| Office assets | `/api/office/upload` | POST | Yes | Admin | Manage logo/stamp |
| License validation | `/api/license/validate` | GET | No | Public runtime check | Electron license gate |
| License activation | `/api/license/activate` | POST | No | Public activation flow | License activation |
| License management | `/api/license` and `/api/license/info` | GET | Yes | Admin | License management |

## Financial security

Assistant access is denied for dedicated financial endpoints. Operational endpoints must not expose financial values or financial content to Assistant. Financial restrictions are enforced server-side and are not dependent on frontend visibility.
