import wave
import struct
import math

SAMPLE_RATE = 44100
DURATION = 16.0

def square_wave(freq, time):
    period = 1.0 / freq
    return 0.5 if (time % period) < (period / 2.0) else -0.5

chords = [
    [261.63, 329.63, 392.00],
    [261.63, 329.63, 392.00],
    [293.66, 349.23, 440.00],
    [246.94, 293.66, 392.00]
]

wave_file = wave.open('bgm.wav', 'w')
wave_file.setnchannels(1)
wave_file.setsampwidth(2)
wave_file.setframerate(SAMPLE_RATE)

num_samples = int(SAMPLE_RATE * DURATION)
for i in range(num_samples):
    t = float(i) / SAMPLE_RATE
    chord_idx = int((t / 2.0)) % len(chords)
    note_idx = int((t * 8.0)) % len(chords[chord_idx])
    freq = chords[chord_idx][note_idx]
    
    env = max(0, 1.0 - (t * 8.0 - int(t * 8.0)))
    
    sample = square_wave(freq, t) * env * 0.3
    
    bass_freq = chords[chord_idx][0] / 2.0
    sample += square_wave(bass_freq, t) * 0.3
    
    int_sample = int(sample * 32767.0)
    int_sample = max(-32768, min(32767, int_sample))
    
    wave_file.writeframes(struct.pack('<h', int_sample))

wave_file.close()
