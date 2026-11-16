import { Pipe, PipeTransform } from '@angular/core';
import { DateInput, formatDateTime } from '../utils/datetime';

@Pipe({
  name: 'dateTime',
  pure: true,
  standalone: true,
})
export class DateTimePipe implements PipeTransform {
  transform(value: DateInput, timeZone?: string): string {
    return formatDateTime(value, timeZone);
  }
}
