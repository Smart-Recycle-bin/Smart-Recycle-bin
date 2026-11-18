import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SafeImage } from './safe-image';

describe('SafeImage', () => {
  let component: SafeImage;
  let fixture: ComponentFixture<SafeImage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SafeImage],
    }).compileComponents();

    fixture = TestBed.createComponent(SafeImage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('renders image when valid src is provided and no error occurred', async () => {
    fixture.componentRef.setInput('src', 'https://example.com/photo.jpg');
    fixture.componentRef.setInput('alt', 'Test photo');
    await fixture.whenStable();

    const img = fixture.nativeElement.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe('https://example.com/photo.jpg');
    expect(img?.getAttribute('alt')).toBe('Test photo');
  });

  it('switches to safe fallback icon when image error event fires without network retry', async () => {
    fixture.componentRef.setInput('src', 'https://example.com/broken.jpg');
    await fixture.whenStable();

    const img = fixture.nativeElement.querySelector('img');
    expect(img).toBeTruthy();

    img.dispatchEvent(new Event('error'));
    await fixture.whenStable();

    const fallback = fixture.nativeElement.querySelector('.safe-fallback');
    expect(fallback).toBeTruthy();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });

  it('renders fallback directly when src is empty or undefined', async () => {
    fixture.componentRef.setInput('src', null);
    fixture.componentRef.setInput('fallbackLabel', 'No preview');
    await fixture.whenStable();

    const fallback = fixture.nativeElement.querySelector('.safe-fallback');
    expect(fallback).toBeTruthy();
    expect(fallback.textContent).toContain('No preview');
  });
});
