using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SmartBin.Models.Constants;

namespace SmartBin.Models
{
    [Table("DISPOSAL_SURVEY")]
    public class DisposalSurvey
    {
        [Key]
        public int SurveyId { get; set; }

        public int SessionId { get; set; }

        public int TotalCalculatedPoints { get; set; } = 0;

        public DateTime CreatedAt { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = SurveyStatus.Waiting;

        [MaxLength(40)]
        public string? Outcome { get; set; }

        public DateTime? SubmittedAt { get; set; }

        public DisposalSession? Session { get; set; }

        public ICollection<SurveyResponse> Responses { get; set; } = new List<SurveyResponse>();
    }
}
