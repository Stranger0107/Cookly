const jwt = require('jsonwebtoken');
const { app, request, createUser } = require('./helpers');
const User = require('../src/models/User');

describe('GET /api/health', () => {
  it('reports ok when the database is connected', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { status: 'ok', database: 'connected' } });
  });
});

describe('Unknown routes and bad JSON', () => {
  it('returns a JSON 404 for routes that do not exist', async () => {
    const res = await request(app).get('/api/nope');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Route not found: GET /api/nope' });
  });

  it('returns 400 for a malformed JSON body', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Malformed JSON in request body');
  });
});

describe('POST /api/auth/register', () => {
  const valid = { name: 'Pratham', email: 'Pratham@Cookly.Test', password: 'secret123' };

  it('creates a user, lowercases the email and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send(valid);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({ name: 'Pratham', email: 'pratham@cookly.test' });
    expect(typeof res.body.data.token).toBe('string');
  });

  it('never returns the password hash', async () => {
    const res = await request(app).post('/api/auth/register').send(valid);

    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|secret123/);
  });

  it('stores a bcrypt hash, not the plain password', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const user = await User.findOne({ email: 'pratham@cookly.test' }).select('+passwordHash');

    expect(user.passwordHash).not.toBe(valid.password);
    expect(user.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('rejects a duplicate email (case-insensitive) with 409', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...valid, email: 'PRATHAM@cookly.test' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('returns field errors for invalid input', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  it('requires the password to contain a number', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...valid, password: 'onlyletters' });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('password');
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with the right credentials (email in any case)', async () => {
    const { user, password } = await createUser();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email.toUpperCase(), password });

    expect(res.status).toBe(200);
    expect(res.body.data.user._id).toBe(user._id);
    expect(res.body.data.token).toBeDefined();
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);
  });

  it('rejects a wrong password with 401', async () => {
    const { user } = await createUser();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrongpass1' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('gives the same message for an unknown email (no user enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@cookly.test', password: 'secret123' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user for a valid token', async () => {
    const { user, auth } = await createUser();
    const res = await request(app).get('/api/auth/me').set('Authorization', auth);

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ _id: user._id, email: user.email });
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects a request without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a tampered token', async () => {
    const { token } = await createUser();
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}x`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid token');
  });

  it('rejects an expired token', async () => {
    const { user } = await createUser();
    const expired = jwt.sign(
      { sub: user._id, exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.JWT_SECRET
    );
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Token expired');
  });

  it('rejects a token whose user has been deleted', async () => {
    const { user, auth } = await createUser();
    await User.findByIdAndDelete(user._id);
    const res = await request(app).get('/api/auth/me').set('Authorization', auth);

    expect(res.status).toBe(401);
  });
});
