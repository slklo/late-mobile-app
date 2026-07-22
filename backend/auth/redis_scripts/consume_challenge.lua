local values = redis.call("HGETALL", KEYS[1])

if #values == 0 then
    return nil
end

redis.call("DEL", KEYS[1])

return values