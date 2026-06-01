use chrono::{DateTime, Utc};
use uuid::Uuid;

// Re-export entity errors from the centralized module
pub use super::entity_errors::{UserError, UserResult};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
// We'll handle conversion manually for now until the type is properly set up in the database
pub enum UserRole {
    Admin,
    User,
}

impl std::fmt::Display for UserRole {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            UserRole::Admin => write!(f, "admin"),
            UserRole::User => write!(f, "user"),
        }
    }
}

#[derive(Debug, Clone)]
pub struct User {
    id: Uuid,
    username: String,
    email: String,
    password_hash: String,
    role: UserRole,
    storage_quota_bytes: i64,
    storage_used_bytes: i64,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    last_login_at: Option<DateTime<Utc>>,
    active: bool,
    oidc_provider: Option<String>,
    oidc_subject: Option<String>,
    image: Option<String>,
    /// TRUE = grant-only external recipient (magic-link, OIDC-only, OCM
    /// federated). FALSE = storage-owning internal user. Hooks that
    /// provision per-user resources (home folder, default calendar, …)
    /// must short-circuit when `is_external` is TRUE — see tip #2 in
    /// `application/ports/user_lifecycle.rs`. The DB CHECK constraint
    /// `users_external_no_storage` is the schema-level safety net.
    is_external: bool,
    /// Optional human-readable first/given name. Populated from OIDC
    /// standard claim `given_name` at JIT provisioning, or via the
    /// profile-edit endpoint. External users start with `None`.
    given_name: Option<String>,
    /// Optional human-readable last/family name. Populated from OIDC
    /// standard claim `family_name` at JIT provisioning, or via the
    /// profile-edit endpoint. External users start with `None`.
    family_name: Option<String>,
}

impl User {
    /// Create a new user with a pre-hashed password.
    ///
    /// The password hashing should be done externally using PasswordHasherPort
    /// to maintain clean architecture and keep cryptographic dependencies
    /// out of the domain layer.
    ///
    /// # Arguments
    /// * `username` - User's username (3-254 characters; may be an email)
    /// * `email` - User's email address
    /// * `password_hash` - Pre-hashed password (from PasswordHasherPort)
    /// * `role` - User's role
    /// * `storage_quota_bytes` - Storage quota in bytes
    pub fn new(
        username: String,
        email: String,
        password_hash: String,
        role: UserRole,
        storage_quota_bytes: i64,
    ) -> UserResult<Self> {
        // Validations
        Self::validate_username(&username)?;
        Self::validate_email(&email)?;

        if password_hash.is_empty() {
            return Err(UserError::InvalidPassword(
                "Password hash cannot be empty".to_string(),
            ));
        }

        let now = Utc::now();

        Ok(Self {
            id: Uuid::new_v4(),
            username,
            email,
            password_hash,
            role,
            storage_quota_bytes,
            storage_used_bytes: 0,
            created_at: now,
            updated_at: now,
            last_login_at: None,
            active: true,
            oidc_provider: None,
            oidc_subject: None,
            image: None,
            is_external: false,
            given_name: None,
            family_name: None,
        })
    }

    /// Create a new OIDC-authenticated user (no password required).
    pub fn new_oidc(
        username: String,
        email: String,
        role: UserRole,
        storage_quota_bytes: i64,
        oidc_provider: String,
        oidc_subject: String,
    ) -> UserResult<Self> {
        Self::validate_username(&username)?;
        Self::validate_email(&email)?;
        let now = Utc::now();
        Ok(Self {
            id: Uuid::new_v4(),
            username,
            email,
            password_hash: "__OIDC_NO_PASSWORD__".to_string(),
            role,
            storage_quota_bytes,
            storage_used_bytes: 0,
            created_at: now,
            updated_at: now,
            last_login_at: None,
            active: true,
            oidc_provider: Some(oidc_provider),
            oidc_subject: Some(oidc_subject),
            image: None,
            is_external: false,
            given_name: None,
            family_name: None,
        })
    }

    /// Create a new external user — magic-link / OIDC-only / OCM-federated
    /// recipient who does NOT own storage. The `CHECK (NOT is_external OR
    /// storage_used_bytes = 0)` DB constraint enforces the no-storage rule
    /// at the schema level.
    ///
    /// **External users are always `UserRole::User`** — there is no role
    /// parameter because admin + external is an explicitly forbidden
    /// combination enforced by the `users_external_not_admin` DB CHECK
    /// constraint. Granting admin to a federated principal would let
    /// external identity providers indirectly manage the local instance.
    /// To make an external user an admin: first convert them to internal
    /// (`UPDATE auth.users SET is_external = FALSE`), then update role.
    /// The two-step process is intentional friction.
    ///
    /// Quota is set to 0 because external users can't upload content
    /// into any folder they own (they have no folder). They can only
    /// act on grants the resource owner provides — which counts against
    /// the owner's quota, not theirs.
    pub fn new_external(username: String, email: String) -> UserResult<Self> {
        Self::validate_username(&username)?;
        Self::validate_email(&email)?;
        let now = Utc::now();
        Ok(Self {
            id: Uuid::new_v4(),
            username,
            email,
            password_hash: "__EXTERNAL_NO_PASSWORD__".to_string(),
            role: UserRole::User,
            storage_quota_bytes: 0,
            storage_used_bytes: 0,
            created_at: now,
            updated_at: now,
            last_login_at: None,
            active: true,
            oidc_provider: None,
            oidc_subject: None,
            image: None,
            is_external: true,
            given_name: None,
            family_name: None,
        })
    }

    #[allow(clippy::too_many_arguments)]
    pub fn from_data(
        id: Uuid,
        username: String,
        email: String,
        password_hash: String,
        role: UserRole,
        storage_quota_bytes: i64,
        storage_used_bytes: i64,
        created_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
        last_login_at: Option<DateTime<Utc>>,
        active: bool,
    ) -> Self {
        Self {
            id,
            username,
            email,
            password_hash,
            role,
            storage_quota_bytes,
            storage_used_bytes,
            created_at,
            updated_at,
            last_login_at,
            active,
            oidc_provider: None,
            oidc_subject: None,
            image: None,
            // `from_data` is the minimal-args reconstruction path used by
            // tests and JWT-claim-based principal hydration (which doesn't
            // carry `is_external`). Default to FALSE — JWT-validated
            // principals are existing internal users; magic-link external
            // sessions take a different path that hydrates from DB via
            // `from_data_full`.
            is_external: false,
            given_name: None,
            family_name: None,
        }
    }

    #[allow(clippy::too_many_arguments)]
    pub fn from_data_full(
        id: Uuid,
        username: String,
        email: String,
        password_hash: String,
        role: UserRole,
        storage_quota_bytes: i64,
        storage_used_bytes: i64,
        created_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
        last_login_at: Option<DateTime<Utc>>,
        active: bool,
        oidc_provider: Option<String>,
        oidc_subject: Option<String>,
        image: Option<String>,
        is_external: bool,
        given_name: Option<String>,
        family_name: Option<String>,
    ) -> Self {
        Self {
            id,
            username,
            email,
            password_hash,
            role,
            storage_quota_bytes,
            storage_used_bytes,
            created_at,
            updated_at,
            last_login_at,
            active,
            oidc_provider,
            oidc_subject,
            image,
            is_external,
            given_name,
            family_name,
        }
    }

    // Getters
    pub fn id(&self) -> Uuid {
        self.id
    }

    pub fn username(&self) -> &str {
        &self.username
    }

    pub fn email(&self) -> &str {
        &self.email
    }

    pub fn role(&self) -> UserRole {
        self.role
    }

    pub fn storage_quota_bytes(&self) -> i64 {
        self.storage_quota_bytes
    }

    pub fn storage_used_bytes(&self) -> i64 {
        self.storage_used_bytes
    }

    pub fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    pub fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    pub fn last_login_at(&self) -> Option<DateTime<Utc>> {
        self.last_login_at
    }

    pub fn is_active(&self) -> bool {
        self.active
    }

    pub fn password_hash(&self) -> &str {
        &self.password_hash
    }

    pub fn oidc_provider(&self) -> Option<&str> {
        self.oidc_provider.as_deref()
    }

    pub fn oidc_subject(&self) -> Option<&str> {
        self.oidc_subject.as_deref()
    }

    pub fn image(&self) -> Option<&str> {
        self.image.as_deref()
    }

    /// `TRUE` for grant-only external recipients (magic-link, OIDC-only,
    /// OCM federated). Hooks provisioning per-user resources must
    /// short-circuit when this returns `true` — see tip #2 in
    /// `application/ports/user_lifecycle.rs`.
    pub fn is_external(&self) -> bool {
        self.is_external
    }

    pub fn given_name(&self) -> Option<&str> {
        self.given_name.as_deref()
    }

    pub fn family_name(&self) -> Option<&str> {
        self.family_name.as_deref()
    }

    pub fn set_image(&mut self, image: Option<String>) {
        self.image = image;
        self.updated_at = Utc::now();
    }

    pub fn set_given_name(&mut self, given_name: Option<String>) {
        self.given_name = given_name;
        self.updated_at = Utc::now();
    }

    pub fn set_family_name(&mut self, family_name: Option<String>) {
        self.family_name = family_name;
        self.updated_at = Utc::now();
    }

    /// Mutate the username after creation. Runs the same validation as the
    /// constructor — callers must still ensure uniqueness at the repo
    /// level. Bumps `updated_at`. Used by the post-create profile-edit
    /// endpoint so a user invited with `username = email` can switch to a
    /// shorter handle later. The home folder name is NOT renamed: it was
    /// display text at creation; the folder is owned by `user_id`.
    pub fn set_username(&mut self, new_username: String) -> UserResult<()> {
        Self::validate_username(&new_username)?;
        self.username = new_username;
        self.updated_at = Utc::now();
        Ok(())
    }

    /// Returns true if this is an OIDC-only user (no password)
    pub fn is_oidc_user(&self) -> bool {
        self.oidc_provider.is_some()
    }

    /// Returns true iff this user has any non-magic-link authentication
    /// method available — either a real (non-placeholder) password hash,
    /// or a linked OIDC subject. Magic-link auto-authentication is only
    /// offered for accounts without any of these.
    ///
    /// The placeholder-string approach is a known smell; a future
    /// `auth.user_auth_methods` side-table will replace it. Migrating that
    /// refactor touches only this method's body — every magic-link
    /// eligibility check goes through here.
    pub fn has_login_credential(&self) -> bool {
        let has_password = self.password_hash != "__EXTERNAL_NO_PASSWORD__"
            && self.password_hash != "__OIDC_NO_PASSWORD__";
        has_password || self.oidc_subject.is_some()
    }

    /// Update the password hash.
    ///
    /// The new password should be hashed externally using PasswordHasherPort
    /// before calling this method.
    pub fn update_password_hash(&mut self, new_hash: String) {
        self.password_hash = new_hash;
        self.updated_at = Utc::now();
    }

    // Update storage usage
    pub fn update_storage_used(&mut self, storage_used_bytes: i64) {
        self.storage_used_bytes = storage_used_bytes;
        self.updated_at = Utc::now();
    }

    // Register login
    pub fn register_login(&mut self) {
        let now = Utc::now();
        self.last_login_at = Some(now);
        self.updated_at = now;
    }

    // Deactivate user
    pub fn deactivate(&mut self) {
        self.active = false;
        self.updated_at = Utc::now();
    }

    // Activate user
    pub fn activate(&mut self) {
        self.active = true;
        self.updated_at = Utc::now();
    }

    // ── Shared validation helpers ──────────────────────────────────────

    /// Usernames must be 3-254 chars. Two accepted shapes:
    ///
    /// - **Traditional**: ASCII alphanumerics, hyphens, underscores, and
    ///   dots. No leading/trailing dot or hyphen. Capped at 254 chars
    ///   (well above the historical 32-char limit, but still safe — the
    ///   real upper bound is RFC 5321's email cap for the email shape).
    /// - **Email-as-username**: must contain `@` and pass `validate_email`.
    ///   External users created from invite-by-email get their normalized
    ///   email as username; internal users may opt into this if they
    ///   prefer their email as their handle.
    ///
    /// Both shapes prevent XSS payloads like `<img/src=x>` from being
    /// stored as usernames — the traditional shape via the explicit
    /// character set, the email shape via `validate_email`'s rejection of
    /// `<`, `>`, quotes, whitespace, etc.
    fn validate_username(username: &str) -> UserResult<()> {
        if username.len() < 3 || username.len() > 254 {
            return Err(UserError::InvalidUsername(
                "Username must be between 3 and 254 characters".to_string(),
            ));
        }

        if username.contains('@') {
            // Email shape — defer to the email validator (which checks the
            // forbidden-character set and the local-part / domain structure).
            return Self::validate_email(username).map_err(|e| match e {
                UserError::ValidationError(m) => {
                    UserError::InvalidUsername(format!("Invalid email-as-username: {}", m))
                }
                other => other,
            });
        }

        if !username
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.')
        {
            return Err(UserError::InvalidUsername(
                "Username may only contain letters, digits, hyphens, underscores, and dots"
                    .to_string(),
            ));
        }
        // Disallow leading/trailing dots or hyphens
        if username.starts_with('.')
            || username.starts_with('-')
            || username.ends_with('.')
            || username.ends_with('-')
        {
            return Err(UserError::InvalidUsername(
                "Username must not start or end with a dot or hyphen".to_string(),
            ));
        }
        Ok(())
    }

    /// Basic but meaningful email validation:
    /// - Must contain exactly one `@`
    /// - Local part and domain must be non-empty
    /// - Domain must contain at least one dot
    /// - No angle brackets, spaces, or other characters used in XSS payloads
    fn validate_email(email: &str) -> UserResult<()> {
        let parts: Vec<&str> = email.splitn(2, '@').collect();
        if parts.len() != 2 {
            return Err(UserError::ValidationError(
                "Invalid email: missing @".to_string(),
            ));
        }
        let (local, domain) = (parts[0], parts[1]);
        if local.is_empty() || domain.is_empty() {
            return Err(UserError::ValidationError(
                "Invalid email: empty local part or domain".to_string(),
            ));
        }
        if !domain.contains('.') {
            return Err(UserError::ValidationError(
                "Invalid email: domain must contain a dot".to_string(),
            ));
        }
        // Reject characters commonly used in XSS / header injection
        let forbidden = [
            '<', '>', '"', '\'', '\\', ' ', '\t', '\n', '\r', '(', ')', ',', ';',
        ];
        if email.chars().any(|c| forbidden.contains(&c)) {
            return Err(UserError::ValidationError(
                "Invalid email: contains forbidden characters".to_string(),
            ));
        }
        if email.len() > 254 {
            return Err(UserError::ValidationError(
                "Invalid email: too long (max 254 characters)".to_string(),
            ));
        }
        Ok(())
    }
}
