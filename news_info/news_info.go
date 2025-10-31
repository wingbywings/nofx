package news_info

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type LiveRecord struct {
	ID            interface{} `json:"id"`
	Content       string      `json:"content"`
	ContentPrefix string      `json:"content_prefix"`
	Link          string      `json:"link"`
	CreatedAtZh   string      `json:"created_at_zh"`
	CreatedAt     int64       `json:"created_at"`
}

type LivesList struct {
	Lives []LiveRecord `json:"lives"`
}

type JinseResponse struct {
	List []LivesList `json:"list"`
}

type CryptoNews struct {
	Index         int    `json:"index"`
	NewID         string `json:"newid"`
	Content       string `json:"content"`
	ContentPrefix string `json:"content_prefix"`
	Link          string `json:"link"`
	Poster        string `json:"poster"`
	Time          string `json:"time"`
}

func GetNewsJinse(limit int) ([]CryptoNews, error) {
	if limit <= 0 {
		limit = 20
	}
	url := "http://api.jinse.cn/noah/v2/lives?limit=20&reading=false&source=web&flag=up&id=353150&category=0"
	client := &http.Client{}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.96 Safari/537.36")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// fmt.Println(string(body))

	var result JinseResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	// fmt.Println(result)

	cryptoNews := []CryptoNews{}
	i := 0

	if len(result.List) > 0 {
		for _, record := range result.List[0].Lives {
			if i >= limit {
				break
			}
			news := CryptoNews{
				Index:         i,
				NewID:         fmt.Sprintf("%v", record.ID),
				Content:       record.Content,
				ContentPrefix: record.ContentPrefix,
				Link:          record.Link,
				Poster:        "金色财经",
				Time:          time.Unix(record.CreatedAt, 0).Format("2006-01-02 15:04:05"),
			}
			// fmt.Println("12", string(record.CreatedAt))
			createdAtTime := time.Unix(record.CreatedAt, 0)
			if time.Since(createdAtTime) > 30*time.Minute {
				continue
			}
			cryptoNews = append(cryptoNews, news)
			i++
		}
	}

	return cryptoNews, nil
}
