export const redisMock = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),

  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),

  incrementVersion: jest.fn().mockResolvedValue(1),
  getVersion: jest.fn().mockResolvedValue(1),
}