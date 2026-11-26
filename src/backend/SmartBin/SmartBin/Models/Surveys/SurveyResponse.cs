using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartBin.Models
{
    [Table("SURVEY_RESPONSE")]
    public class SurveyResponse
    {
        [Key]
        public int ResponseId { get; set; }

        public int SurveyId { get; set; }

        public int ItemId { get; set; }

        public bool IsCorrect { get; set; }

        public int? UserSelectedTypeId { get; set; }

        public DateTime CreatedAt { get; set; }

        public DisposalSurvey? Survey { get; set; }

        public DisposalItem? Item { get; set; }

        public WasteType? UserSelectedType { get; set; }
    }
}
